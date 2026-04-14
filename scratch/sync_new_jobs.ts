import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const jobsToSync = [
  { jobId: "47b2f090-47ac-40a1-a1a2-14158cae0756", name: "Medical Biller, Rheumatology, Elation Health (PA)" },
  { jobId: "5813c2de-d60e-4795-b5d6-00b51a54237c", name: " Healthcare Assistant, Personal Injury, eClinicalWorks (FL)" },
  { jobId: "643e8e42-45d4-48b2-9db8-76722810b15b", name: "Patient Coordinator, Dental, Dentrix (FL)" },
  { jobId: "6ddb518d-5814-4b52-9cc5-ed7f4a1baf63", name: " Insurance Authorization Specialist, Physical Therapy, ClinicMind (NJ)" },
  { jobId: "73d4573c-5588-4f65-837f-bfd86ac7b7a4", name: "Front Desk Manager, Orthopedic, ModMed (NJ)" },
  { jobId: "73fe5452-a485-468f-ac51-e209126cf64b", name: "Medical Biller, Podiatry, CureMD (VA)" },
  { jobId: "96da82f2-8271-4916-b23d-5ac091cf6d3e", name: "Prior Authorization Specialist, Medical Infusions, Availity (TX)" },
  { jobId: "9ffe6051-cff5-4aea-87a9-fca0600695d3", name: " Patient Coordinator, Med Spa (DC)" },
  { jobId: "b932cf27-66e5-4e1c-8711-b99ecf6350cb", name: " Billing and Revenue Cycle Specialist, Orthopedic, ModMed (NJ)" },
  { jobId: "d775f8e9-a57f-4239-925a-399dd81909e1", name: " Front Desk Coordinator, Rheumatology, Elation Health (PA)" },
  { jobId: "ded46ab7-aade-4b52-bcd7-a6e3e3576cad", name: "Patient Care Coordinator, Orthopedic, ModMed (NJ)" }
]

async function run() {
  for (const job of jobsToSync) {
    const { jobId } = job
    const name = job.name.trim()

    console.log(`Processing: ${name}`)

    const { data: existingTRole } = await supabase
      .from('order_turnaround_roles')
      .select('*')
      .eq('test_link_id', jobId)
      .single()

    if (existingTRole) {
      console.log(`Already exists.`)
      continue
    }

    const { data: newTRole, error: turnErr } = await supabase
      .from('order_turnaround_roles')
      .insert({ role: name, status: 'Active', test_link_id: jobId })
      .select().single()

    if (turnErr) {
      console.error('Error inserting turnaround role:', turnErr)
      continue
    }

    const tabs = ['Upwork', 'Live']
    for (const tab of tabs) {
      const { data: newCRole, error: cmpErr } = await supabase
        .from('campaign_tracker_roles')
        .insert({
          tab_type: tab,
          role_name: name,
          turnaround_role_id: newTRole.id,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select().single()

      if (cmpErr) {
        console.error('Error inserting cmp role:', cmpErr)
        continue
      }

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
    console.log(`Successfully added: ${name}`)
  }
}

run().catch(console.error)
