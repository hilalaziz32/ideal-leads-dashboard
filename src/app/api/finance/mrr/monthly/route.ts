import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  try {
    const { data, error } = await supabase
      .from('finance_mrr_monthly_projections')
      .select('*')
      .eq('year', year)
      .order('month', { ascending: true })

    if (error) throw error

    // Auto-scaffold 12 months if missing
    const projections = data || []
    if (projections.length < 12) {
      const existingM = projections.map(p => p.month)
      const toInsert = []
      for (let m = 1; m <= 12; m++) {
        if (!existingM.includes(m)) {
          toInsert.push({ year, month: m })
        }
      }
      if (toInsert.length > 0) {
        const { data: newRows } = await supabase.from('finance_mrr_monthly_projections').upsert(toInsert).select()
        if (newRows) {
          projections.push(...newRows)
          projections.sort((a,b) => a.month - b.month)
        }
      }
    }

    return NextResponse.json(projections)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { data, error } = await supabase
      .from('finance_mrr_monthly_projections')
      .upsert(payload, { onConflict: 'year,month' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
