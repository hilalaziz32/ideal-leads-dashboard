import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('daily_job_link_submission_stats_table')
    .select('day, job_id, job_name, test_title, test_link_id, submitted_count, passed_count, failed_count, disqualified_count')
    .order('day', { ascending: false })
    .limit(300)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // SYNC: Group by job_id (stable unique identifier) and seed trackers
  if (data && data.length > 0) {
    await syncTrackingRows(data)
  }

  return NextResponse.json(data ?? [])
}

async function syncTrackingRows(screeningData: any[]) {
  // Group by job_id — the STABLE unique identifier. test_link_id changes per day, job_id never changes.
  const roleGroups = new Map<string, any>()
  screeningData.filter(s => s.job_id).forEach(s => {
    const name = (s.job_name || s.test_title || '').trim()
    if (!name) return
    if (!roleGroups.has(s.job_id)) {
      roleGroups.set(s.job_id, { ...s, name })
    }
  })

  if (roleGroups.size === 0) return

  // Fetch ALL existing roles (test_link_id column stores job_id as stable link)
  const { data: existingRoles } = await supabase
    .from('order_turnaround_roles')
    .select('id, role, test_link_id')

  const existingByJobId = new Map((existingRoles || []).filter(r => r.test_link_id).map(r => [r.test_link_id, r]))
  const existingByName = new Map((existingRoles || []).map(r => [r.role, r]))

  for (const [jobId, stat] of roleGroups) {
    const name = stat.name

    // Already exists by job_id → update name if changed
    if (existingByJobId.has(jobId)) {
      const existing = existingByJobId.get(jobId)!
      if (existing.role !== name) {
        await supabase.from('order_turnaround_roles').update({ role: name }).eq('id', existing.id)
        await supabase.from('campaign_tracker_roles').update({ role_name: name }).eq('turnaround_role_id', existing.id)
      }
      continue
    }

    // Already exists by name → stamp it with this job_id
    if (existingByName.has(name)) {
      await supabase.from('order_turnaround_roles').update({ test_link_id: jobId }).eq('id', existingByName.get(name)!.id)
      continue
    }

    // Brand NEW role — create in Live Tracker
    const { data: newTRole } = await supabase
      .from('order_turnaround_roles')
      .insert({ role: name, status: 'Active', test_link_id: jobId })
      .select().single()

    if (!newTRole) continue

    // Create in BOTH Campaign Tracker tabs
    const tabs = ['Upwork', 'Live']
    for (const tab of tabs) {
      const { data: newCRole } = await supabase
        .from('campaign_tracker_roles')
        .insert({
          tab_type: tab,
          role_name: name,
          turnaround_role_id: newTRole.id,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select().single()

      if (!newCRole) continue

      const sources = ['Recruiter Outbound', 'Indeed', 'LinkedIn']
      const metrics = tab === 'Upwork'
        ? ['Proposals (total)', 'Applicants (daily)', 'Completed Screening (daily)', 'L1 Interview Invites (daily)', 'Succeed']
        : ['Completed Screening (daily)', 'Passed Screenings (daily)']

      for (let i = 0; i < sources.length; i++) {
        const { data: src } = await supabase
          .from('campaign_tracker_sources')
          .insert({ role_id: newCRole.id, source_name: sources[i], sort_order: i })
          .select().single()

        if (src) {
          await supabase.from('campaign_tracker_metrics').insert(
            metrics.map((m, idx) => ({ source_id: src.id, metric_name: m, sort_order: idx }))
          )
        }
      }
    }
  }
}
