import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Ensure nulls for empty date fields to avoid postgres errors
    if ('target_placement_date' in body && body.target_placement_date === '') body.target_placement_date = null
    if ('placed_on' in body && body.placed_on === '') body.placed_on = null
    if ('start_date' in body && body.start_date === '') body.start_date = null
    if ('recruiting_start_date' in body && body.recruiting_start_date === '') body.recruiting_start_date = null
    if ('recruitment_completion_date' in body && body.recruitment_completion_date === '') body.recruitment_completion_date = null
    if ('recruiter_id' in body && body.recruiter_id === '') body.recruiter_id = null
    if ('lead_id' in body && body.lead_id === '') body.lead_id = null
    if ('quarter_override' in body && body.quarter_override === '') body.quarter_override = null
    if ('m1_status' in body && body.m1_status === '') body.m1_status = null
    if ('m2_status' in body && body.m2_status === '') body.m2_status = null
    if ('m3_status' in body && body.m3_status === '') body.m3_status = null
    if ('m4_status' in body && body.m4_status === '') body.m4_status = null
    if ('m5_status' in body && body.m5_status === '') body.m5_status = null

    const { error } = await supabase
      .from('order_turnaround_roles')
      .update(body)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await supabase.from('order_turnaround_roles').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
