import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') || new Date().getFullYear().toString()
  
  try {
    const { data, error } = await supabase
      .from('finance_mrr_daily')
      .select('*')
      .gte('entry_date', `${year}-01-01`)
      .lte('entry_date', `${year}-12-31`)
      .order('entry_date', { ascending: true })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { entry_date, actual_mrr, expected_placements, actual_placements } = await req.json()

    if (!entry_date) return NextResponse.json({ error: 'Missing entry_date' }, { status: 400 })

    const payload: any = { entry_date }
    if (actual_mrr !== undefined) payload.actual_mrr = actual_mrr === '' ? null : actual_mrr
    if (expected_placements !== undefined) payload.expected_placements = expected_placements === '' ? null : expected_placements
    if (actual_placements !== undefined) payload.actual_placements = actual_placements === '' ? null : actual_placements

    const { data, error } = await supabase
      .from('finance_mrr_daily')
      .upsert(payload, { onConflict: 'entry_date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
