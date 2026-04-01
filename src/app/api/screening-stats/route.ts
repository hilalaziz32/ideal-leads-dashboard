import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('daily_job_link_submission_stats_table')
    .select('day, job_name, test_title, submitted_count, passed_count, failed_count, disqualified_count')
    .order('day', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
