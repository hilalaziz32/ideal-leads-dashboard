import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    
    if ('tracker_role_id' in body && body.tracker_role_id === '') body.tracker_role_id = null
    if ('manual_start_date' in body && body.manual_start_date === '') body.manual_start_date = null
    if ('predicted_placement_date' in body && body.predicted_placement_date === '') body.predicted_placement_date = null

    const { error } = await supabase
      .from('turnaround_role_predictions')
      .update(body)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabase.from('turnaround_role_predictions').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
