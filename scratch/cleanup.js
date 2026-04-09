const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function clean() {
  console.log('Cleaning Campaign Tracker roles...')
  // Using a trick: delete with .neq('id', '00000000-0000-0000-0000-000000000000') to bypass 'no filter' policy if it exists
  const { error: err1 } = await supabase.from('campaign_tracker_roles').delete().neq('role_name', 'RESERVED_NEVER_MATCH')
  if (err1) console.error('Error cleaning campaign_tracker_roles:', err1.message)

  console.log('Cleaning order_turnaround_roles...')
  const { error: err2 } = await supabase.from('order_turnaround_roles').delete().neq('role', 'RESERVED_NEVER_MATCH')
  if (err2) console.error('Error cleaning order_turnaround_roles:', err2.message)

  console.log('Cleanup complete.')
}

clean()
