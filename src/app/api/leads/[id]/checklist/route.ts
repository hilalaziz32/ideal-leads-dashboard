import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { ChecklistItemState } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get current stage of lead
  const { data: lead, error: leadError } = await supabase
    .from('order_leads')
    .select('current_stage')
    .eq('id', id)
    .single()

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 404 })
  }

  const currentStage = lead.current_stage

  // Get checklist config for current stage
  const { data: config } = await supabase
    .from('pipeline_stage_checklist_config')
    .select('*')
    .eq('stage', currentStage)
    .order('sequence_order')

  // Get current stage record (for metadata / completed items)
  const { data: stageRecord } = await supabase
    .from('order_processing_pipeline_stages')
    .select('metadata')
    .eq('lead_id', id)
    .eq('stage', currentStage)
    .order('entered_at', { ascending: false })
    .limit(1)
    .single()

  const metadata = (stageRecord?.metadata ?? {}) as Record<string, boolean>

  const checklist: ChecklistItemState[] = (config ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    required: item.required,
    sequence_order: item.sequence_order,
    done: Boolean(metadata[item.key]),
  }))

  return NextResponse.json({ stage: currentStage, checklist })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { key, done } = body as { key: string; done: boolean }

  // Get current stage
  const { data: lead, error: leadError } = await supabase
    .from('order_leads')
    .select('current_stage')
    .eq('id', id)
    .single()

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 404 })
  }

  const currentStage = lead.current_stage

  // Get or create stage record
  const { data: stageRecord } = await supabase
    .from('order_processing_pipeline_stages')
    .select('id, metadata')
    .eq('lead_id', id)
    .eq('stage', currentStage)
    .order('entered_at', { ascending: false })
    .limit(1)
    .single()

  if (!stageRecord) {
    return NextResponse.json({ error: 'Stage record not found' }, { status: 404 })
  }

  const updatedMetadata = {
    ...(stageRecord.metadata as Record<string, unknown>),
    [key]: done,
  }

  const { error } = await supabase
    .from('order_processing_pipeline_stages')
    .update({ metadata: updatedMetadata })
    .eq('id', stageRecord.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, metadata: updatedMetadata })
}
