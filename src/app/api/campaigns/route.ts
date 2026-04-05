import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tabType = searchParams.get('tab_type')

  let query = supabase
    .from('campaign_tracker_roles')
    .select(`
      *,
      campaign_tracker_sources (
        *,
        campaign_tracker_metrics (
          *,
          campaign_tracker_daily_entries (*)
        )
      )
    `)
    .order('created_at', { ascending: false })
  
  if (tabType) {
    query = query.eq('tab_type', tabType)
  }

  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tab_type, role_name, start_date } = body
    
    if (!tab_type || !role_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create Role
    const { data: role, error: rErr } = await supabase
      .from('campaign_tracker_roles')
      .insert({
        tab_type, 
        role_name, 
        start_date: start_date || null
      })
      .select().single()
      
    if (rErr) throw rErr

    // 2. Default Sources
    const sources = ['Recruiter Outbound', 'Indeed', 'LinkedIn']
    
    // Default metrics depend on tab
    const metrics = tab_type === 'Upwork' 
      ? ['Proposals (total)', 'Applicants (daily)', 'Completed Screening (daily)', 'L1 Interview Invites (daily)', 'Succeed']
      : ['Completed Screening (daily)', 'Passed Screenings (daily)']

    for (let i = 0; i < sources.length; i++) {
        const { data: source, error: sErr } = await supabase
            .from('campaign_tracker_sources')
            .insert({ role_id: role.id, source_name: sources[i], sort_order: i })
            .select().single()

        if (sErr) throw sErr
        
        // 3. Create Metrics
        const metricsInserts = metrics.map((m, idx) => ({
            source_id: source.id,
            metric_name: m,
            sort_order: idx
        }))
        
        const { error: mErr } = await supabase
            .from('campaign_tracker_metrics')
            .insert(metricsInserts)
            
        if (mErr) throw mErr
    }
    
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
