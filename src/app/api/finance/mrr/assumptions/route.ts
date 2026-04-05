import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  try {
    const { data, error } = await supabase
      .from('finance_mrr_assumptions')
      .select('*')
      .eq('year', year)
      .order('quarter', { ascending: true })

    if (error) throw error
    
    // Auto-scaffold missing quarters
    const assumptions = data || []
    if (assumptions.length < 4) {
      const existingQs = assumptions.map(a => a.quarter)
      const toInsert = []
      for (let q = 1; q <= 4; q++) {
        if (!existingQs.includes(q)) {
          toInsert.push({ year, quarter: q })
        }
      }
      if (toInsert.length > 0) {
        const { data: newRows } = await supabase.from('finance_mrr_assumptions').upsert(toInsert).select()
        if (newRows) {
          assumptions.push(...newRows)
          assumptions.sort((a,b) => a.quarter - b.quarter)
        }
      }
    }
    
    return NextResponse.json(assumptions)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    // payload should have year, quarter, and the fields to update
    const { data, error } = await supabase
      .from('finance_mrr_assumptions')
      .upsert(payload, { onConflict: 'year,quarter' })
      .select()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
