import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab')

  try {
    // 1. Get people
    const { data: people, error: pErr } = await supabase.from('finance_kpi_people').select('*')
    if (pErr) throw pErr

    // 2. Get definitions belonging to this tab
    let defQuery = supabase.from('finance_kpi_definitions').select('*')
    if (tab) {
      defQuery = defQuery.eq('tab_source', tab)
    }
    const { data: definitions, error: dErr } = await defQuery
    if (dErr) throw dErr

    if (definitions.length === 0) return NextResponse.json({ people, kpis: [] })

    const kpiIds = definitions.map(d => d.id)

    // 3. Get Targets
    const { data: targets, error: tErr } = await supabase
      .from('finance_kpi_targets')
      .select('*')
      .in('kpi_id', kpiIds)

    if (tErr) throw tErr

    // 4. Get Actuals
    const { data: actuals, error: aErr } = await supabase
      .from('finance_kpi_actuals')
      .select('*')
      .in('kpi_id', kpiIds)

    if (aErr) throw aErr

    // Assemble payload
    const payload = definitions.map(def => {
      const defTargets = targets.filter(t => t.kpi_id === def.id)
      const defActuals = actuals.filter(a => a.kpi_id === def.id)
      return {
        ...def,
        targets: defTargets,
        actuals: defActuals
      }
    })

    return NextResponse.json({ people, kpis: payload })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json()
    // A router logic to handle upserting people, defs, targets, actuals
    if (action === 'upsert_actual') {
      const { data, error } = await supabase.from('finance_kpi_actuals').upsert(payload, { onConflict: 'kpi_id,date_start' }).select()
      if (error) throw error; return NextResponse.json(data)
    }
    if (action === 'upsert_target') {
      const { data, error } = await supabase.from('finance_kpi_targets').upsert(payload, { onConflict: 'kpi_id,date_start' }).select()
      if (error) throw error; return NextResponse.json(data)
    }
    if (action === 'add_person') {
      const { data, error } = await supabase.from('finance_kpi_people').insert(payload).select()
      if (error) throw error; return NextResponse.json(data)
    }
    if (action === 'add_kpi') {
      const { data, error } = await supabase.from('finance_kpi_definitions').insert(payload).select()
      if (error) throw error; return NextResponse.json(data)
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
