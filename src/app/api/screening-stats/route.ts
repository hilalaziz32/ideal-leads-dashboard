import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('daily_job_link_submission_stats_table')
    .select('day, job_name, test_title, submitted_count, passed_count, failed_count, disqualified_count')
    .order('day', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // SILENT AUTO-SYNC: If Zapier sends a new test_title, auto-create tracker rows for it so the user can manually fill info!
  if (data && data.length > 0) {
    // Fire and forget (don't await) to avoid blocking the GET request
    syncTrackingRows(data).catch(console.error)
  }

  return NextResponse.json(data ?? [])
}

async function syncTrackingRows(screeningData: any[]) {
  // 1. Get unique test titles from Zapier data
  const uniqueTitles = Array.from(new Set(screeningData.map(s => s.test_title).filter(Boolean)))
  
  // 2. Fetch existing turnaround roles
  const { data: existingTRoles } = await supabase.from('order_turnaround_roles').select('id, role')
  const existingNames = new Set((existingTRoles || []).map(r => r.role))

  // 3. For each missing title, create it in order_turnaround_roles AND campaign_tracker_roles
  for (const title of uniqueTitles) {
    if (!existingNames.has(title)) {
       // A: Insert into Turnaround (Live Tracker)
       const { data: newTRole, error: err1 } = await supabase
         .from('order_turnaround_roles')
         .insert({ role: title, status: 'Active' })
         .select().single()
         
       if (newTRole) {
         // B: Insert into Campaign Tracker (Live Tab)
         const { data: newCRole } = await supabase
           .from('campaign_tracker_roles')
           .insert({
             tab_type: 'Live',
             role_name: title,
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
