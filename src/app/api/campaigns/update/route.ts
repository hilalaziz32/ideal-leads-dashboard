import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  try {
    const { table, id, payload } = await req.json()

    if (!table || !id || !payload) {
      return NextResponse.json({ error: 'Missing table, id, or payload' }, { status: 400 })
    }

    const validTables = ['campaign_tracker_roles', 'campaign_tracker_sources', 'campaign_tracker_metrics']
    if (!validTables.includes(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
    }

    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
