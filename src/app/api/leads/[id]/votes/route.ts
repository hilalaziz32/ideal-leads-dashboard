import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: votes, error } = await supabase
    .from('pipeline_votes')
    .select('*')
    .eq('lead_id', id)
    .order('voted_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Tally by stage
  const tally: Record<string, { approve: number; reject: number; voters: typeof votes }> = {}
  for (const vote of votes ?? []) {
    if (!tally[vote.stage]) {
      tally[vote.stage] = { approve: 0, reject: 0, voters: [] }
    }
    tally[vote.stage][vote.vote as 'approve' | 'reject']++
    tally[vote.stage].voters.push(vote)
  }

  return NextResponse.json({ votes: votes ?? [], tally })
}
