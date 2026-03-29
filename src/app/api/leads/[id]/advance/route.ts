import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { moved_by } = body as { moved_by?: string }

  // Get lead current stage
  const { data: lead, error: leadError } = await supabase
    .from('order_leads')
    .select('current_stage')
    .eq('id', id)
    .single()

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 404 })
  }

  const currentStage = lead.current_stage

  // Get required checklist items
  const { data: checklistConfig } = await supabase
    .from('pipeline_stage_checklist_config')
    .select('key, required')
    .eq('stage', currentStage)

  // Get stage metadata
  const { data: stageRecord } = await supabase
    .from('order_processing_pipeline_stages')
    .select('id, metadata')
    .eq('lead_id', id)
    .eq('stage', currentStage)
    .order('entered_at', { ascending: false })
    .limit(1)
    .single()

  const metadata = (stageRecord?.metadata ?? {}) as Record<string, boolean>

  // Validate all required items are done
  const requiredItems = (checklistConfig ?? []).filter((c) => c.required)
  const allDone = requiredItems.every((item) => metadata[item.key] === true)

  if (!allDone) {
    const missing = requiredItems
      .filter((item) => !metadata[item.key])
      .map((item) => item.key)
    return NextResponse.json(
      { error: 'Required checklist items not complete', missing },
      { status: 400 }
    )
  }

  // Get next stage from config
  const { data: stageConfig } = await supabase
    .from('pipeline_stage_config')
    .select('stage, sequence_order')
    .order('sequence_order')

  const currentConfig = stageConfig?.find((s) => s.stage === currentStage)
  const nextConfig = stageConfig?.find(
    (s) => s.sequence_order === (currentConfig?.sequence_order ?? 0) + 1
  )

  if (!nextConfig) {
    return NextResponse.json({ error: 'Already at final stage' }, { status: 400 })
  }

  const nextStage = nextConfig.stage
  const now = new Date().toISOString()

  // Close current stage record
  if (stageRecord) {
    await supabase
      .from('order_processing_pipeline_stages')
      .update({ exited_at: now })
      .eq('id', stageRecord.id)
  }

  // Create new stage record
  const { error: insertError } = await supabase
    .from('order_processing_pipeline_stages')
    .insert({
      lead_id: id,
      stage: nextStage,
      moved_by: moved_by ?? 'system',
      entered_at: now,
      metadata: {},
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Update lead current_stage
  const { error: updateError } = await supabase
    .from('order_leads')
    .update({ current_stage: nextStage, updated_at: now })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, previous_stage: currentStage, new_stage: nextStage })
}
