import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { stage, due_at, set_by } = body as {
    stage: string
    due_at: string
    set_by?: string
  }

  // Upsert due date for this lead+stage
  const { data: existing } = await supabase
    .from('pipeline_stage_due_dates')
    .select('id')
    .eq('lead_id', id)
    .eq('stage', stage)
    .single()

  const now = new Date().toISOString()

  if (existing) {
    const { error } = await supabase
      .from('pipeline_stage_due_dates')
      .update({ due_at, set_by: set_by ?? null, updated_at: now })
      .eq('id', existing.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from('pipeline_stage_due_dates')
      .insert({ lead_id: id, stage, due_at, set_by: set_by ?? null })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
