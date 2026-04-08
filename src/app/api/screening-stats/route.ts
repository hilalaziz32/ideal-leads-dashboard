import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('daily_job_link_submission_stats_table')
    .select('day, job_name, test_title, test_link_id, submitted_count, passed_count, failed_count, disqualified_count')
    .order('day', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // SYNC: We await this now to ensure consistency, but it's optimized for bulk
  if (data && data.length > 0) {
    await syncTrackingRows(data)
  }

  return NextResponse.json(data ?? [])
}

async function syncTrackingRows(screeningData: any[]) {
  // 1. Get unique tests from Zapier data using test_link_id
  const uniqueTests = Array.from(
    new Map(
        screeningData
            .filter(s => s.test_link_id)
            .map(s => [s.test_link_id, s])
    ).values()
  )
  
  if (uniqueTests.length === 0) return

  // 2. Fetch existing turnaround roles by test_link_id
  const { data: existingTRoles } = await supabase
    .from('order_turnaround_roles')
    .select('test_link_id')
    .in('test_link_id', uniqueTests.map(t => t.test_link_id))

  const existingIds = new Set((existingTRoles || []).map(r => r.test_link_id))

  // 3. For each missing test_link_id, create it
  for (const test of uniqueTests) {
    if (!existingIds.has(test.test_link_id)) {
       // A: Insert into Turnaround (Live Tracker)
       const { data: newTRole, error: err1 } = await supabase
         .from('order_turnaround_roles')
         .insert({ 
            role: test.test_title || test.job_name, 
            status: 'Active',
            test_link_id: test.test_link_id
         })
         .select().single()
         
       if (newTRole) {
         // B: Insert into Campaign Tracker (Live Tab)
         const { data: newCRole } = await supabase
           .from('campaign_tracker_roles')
           .insert({
             tab_type: 'Live',
             role_name: test.test_title || test.job_name,
             turnaround_role_id: newTRole.id,
             start_date: new Date().toISOString().split('T')[0]
           })
           .select().single()

         // C: Initialize standard Campaign Tracker metrics/sources
         if (newCRole) {
           const sources = ['Recruiter Outbound', 'Indeed', 'LinkedIn']
           const metrics = ['Completed Screening (daily)', 'Passed Screenings (daily)']

           for (let i = 0; i < sources.length; i++) {
             const { data: src } = await supabase
               .from('campaign_tracker_sources')
               .insert({ role_id: newCRole.id, source_name: sources[i], sort_order: i })
               .select().single()

             if (src) {
               const metricsInserts = metrics.map((m, idx) => ({
                 source_id: src.id,
                 metric_name: m,
                 sort_order: idx
               }))
               await supabase.from('campaign_tracker_metrics').insert(metricsInserts)
             }
           }
         }
       }
    }
  }
}
