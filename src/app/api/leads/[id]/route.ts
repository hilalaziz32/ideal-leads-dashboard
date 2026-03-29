import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [leadRes, stagesRes, votesRes, dueDatesRes, stageConfigRes] = await Promise.all([
    supabase.from('order_leads').select('*').eq('id', id).single(),
    supabase
      .from('order_processing_pipeline_stages')
      .select('*')
      .eq('lead_id', id)
      .order('entered_at', { ascending: true }),
    supabase.from('pipeline_votes').select('*').eq('lead_id', id),
    supabase.from('pipeline_stage_due_dates').select('*').eq('lead_id', id),
    supabase.from('pipeline_stage_config').select('*').order('sequence_order'),
  ])

  if (leadRes.error) {
    return NextResponse.json({ error: leadRes.error.message }, { status: 404 })
  }

  return NextResponse.json({
    lead: leadRes.data,
    stages: stagesRes.data ?? [],
    votes: votesRes.data ?? [],
    due_dates: dueDatesRes.data ?? [],
    stage_config: stageConfigRes.data ?? [],
  })
}
