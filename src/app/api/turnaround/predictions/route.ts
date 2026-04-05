import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('turnaround_role_predictions')
    .select(`
      *,
      order_turnaround_roles (
        id,
        role,
        start_date,
        order_leads (
          created_at
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { data, error } = await supabase
      .from('turnaround_role_predictions')
      .insert({ 
        tracker_role_id: body.tracker_role_id || null,
        manual_role_name: body.manual_role_name || '',
        manual_start_date: body.manual_start_date || null,
        predicted_placement_date: body.predicted_placement_date || null
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
