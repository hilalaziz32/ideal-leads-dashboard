import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/leads/:id/qualify
// Anyone on the team clicks this → lead is immediately qualified (stage → approved)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { qualified_by } = body as { qualified_by?: string }

  // Get lead current stage
  const { data: lead, error: leadError } = await supabase
    .from('order_leads')
    .select('current_stage')
    .eq('id', id)
    .single()

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 404 })
  }

  // Already approved or past that? Just return success
  const APPROVED_STAGES = ['approved', 'job-description', 'confirmation-sent', 'active-recruitment', 'candidates-sourced', 'candidates-submitted', 'rm-interview', 'josh-interview', 'client-interview', 'offer-placement', 'closed']
  if (APPROVED_STAGES.includes(lead.current_stage)) {
    return NextResponse.json({ success: true, already_qualified: true, stage: lead.current_stage })
  }

  const now = new Date().toISOString()

  // Close current stage record
  await supabase
    .from('order_processing_pipeline_stages')
    .update({ exited_at: now })
    .eq('lead_id', id)
    .eq('stage', lead.current_stage)
    .is('exited_at', null)

  // Create approved stage record
  await supabase
    .from('order_processing_pipeline_stages')
    .insert({
      lead_id: id,
      stage: 'approved',
      moved_by: qualified_by ?? 'team',
      entered_at: now,
      metadata: { qualified: true },
    })

  // Update lead current stage to approved
  const { error: updateError } = await supabase
    .from('order_leads')
    .update({ current_stage: 'approved', updated_at: now })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    previous_stage: lead.current_stage,
    new_stage: 'approved',
    qualified_by: qualified_by ?? 'team',
  })
}
