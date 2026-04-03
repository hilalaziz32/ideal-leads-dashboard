import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('leads_manual_actuals')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  try {
    const { day, metric_type, value } = await req.json()

    const { data, error } = await supabase
      .from('leads_manual_actuals')
      .upsert(
        { day, metric_type, value, updated_at: new Date().toISOString() },
        { onConflict: 'day,metric_type' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
