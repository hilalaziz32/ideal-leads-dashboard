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
  // 1. Group by role name (test_title or job_name)
  const roleGroups = new Map()
  screeningData.filter(s => s.test_link_id).forEach(s => {
    const name = (s.test_title || s.job_name || '').trim()
    if (!name) return
    // Keep the one with the most recent data or just the first we see
    if (!roleGroups.has(name)) {
      roleGroups.set(name, s)
    }
  })

  if (roleGroups.size === 0) return

  // 2. Fetch ALL existing roles to check in memory (much faster than individual queries)
  const { data: existingRoles } = await supabase
    .from('order_turnaround_roles')
    .select('id, role, test_link_id')

  const rolesByName = new Map((existingRoles || []).map(r => [r.role, r]))
  const rolesById = new Map((existingRoles || []).filter(r => r.test_link_id).map(r => [r.test_link_id, r]))

  // 3. Process each role from stats
  for (const [name, stat] of roleGroups) {
    const existingById = rolesById.get(stat.test_link_id)
    const existingByName = rolesByName.get(name)

    if (existingById) {
      // Role already exists with this ID, check if name matches and update if name changed
      if (existingById.role !== name) {
        await supabase.from('order_turnaround_roles').update({ role: name }).eq('id', existingById.id)
        await supabase.from('campaign_tracker_roles').update({ role_name: name }).eq('turnaround_role_id', existingById.id)
      }
      continue
    }

    if (existingByName) {
      // Role exists by name but has no ID or different ID
      // Update its ID to match the new screening test
      await supabase.from('order_turnaround_roles').update({ test_link_id: stat.test_link_id }).eq('id', existingByName.id)
      continue
    }

    // Creating NEW role (not found by ID or Name)
    const { data: newTRole, error: err1 } = await supabase
      .from('order_turnaround_roles')
      .insert({ 
        role: name, 
        status: 'Active',
        test_link_id: stat.test_link_id
      })
      .select().single()
      
    if (newTRole) {
      // Create campaign tracker linked row
      const { data: newCRole } = await supabase
        .from('campaign_tracker_roles')
        .insert({
          tab_type: 'Live',
          role_name: name,
          turnaround_role_id: newTRole.id,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select().single()

      if (newCRole) {
        // Init default metrics
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
