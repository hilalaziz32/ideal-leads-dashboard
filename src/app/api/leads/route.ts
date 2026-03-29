import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  // Fetch all leads
  const { data: leads, error: leadsError } = await supabase
    .from('order_leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 })
  }

  // Fetch all due dates
  const { data: dueDates } = await supabase
    .from('pipeline_stage_due_dates')
    .select('*')

  // Fetch stage config for labels
  const { data: stageConfig } = await supabase
    .from('pipeline_stage_config')
    .select('stage, label, sequence_order')

  const stageConfigMap = new Map(stageConfig?.map((s) => [s.stage, s]) ?? [])
  const now = new Date()

  const leadsWithOverdue = leads?.map((lead) => {
    const dueDateForCurrentStage = dueDates?.find(
      (d) => d.lead_id === lead.id && d.stage === lead.current_stage
    )
    const isOverdue =
      dueDateForCurrentStage
        ? new Date(dueDateForCurrentStage.due_at) < now
        : false

    return {
      ...lead,
      is_overdue: isOverdue,
      due_date: dueDateForCurrentStage ?? null,
      stage_label: stageConfigMap.get(lead.current_stage)?.label ?? lead.current_stage,
    }
  })

  return NextResponse.json(leadsWithOverdue ?? [])
}
