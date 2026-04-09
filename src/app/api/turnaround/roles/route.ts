import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('order_turnaround_roles')
    .select('*, order_leads(contact_name, created_at), referral_partners(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Ensure properly nullified values for FK keys instead of empty strings
    const payload = {
      ...body,
      role: body.role || null,
      lead_id: body.lead_id || null,
      recruiter_id: body.recruiter_id || null,
      start_date: body.start_date || null,
      target_placement_date: body.target_placement_date || null,
      placed_on: body.placed_on || null
    }

    const { data, error } = await supabase
      .from('order_turnaround_roles')
      .insert(payload)
      .select('*, order_leads(contact_name, created_at), referral_partners(name)')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
