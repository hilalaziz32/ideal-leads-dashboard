import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { metric_id, entry_date, entry_value } = await req.json()

    if (!metric_id || !entry_date) {
      return NextResponse.json({ error: 'Missing metric_id or entry_date' }, { status: 400 })
    }

    if (entry_value === '' || entry_value === null) {
      // If the user clears it, we can just delete the entry or set to null.
      // Setting to null/empty is fine.
      const { data, error } = await supabase
        .from('campaign_tracker_daily_entries')
        .delete()
        .match({ metric_id, entry_date })
      
      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    }

    const { data, error } = await supabase
      .from('campaign_tracker_daily_entries')
      .upsert(
        { metric_id, entry_date, entry_value },
        { onConflict: 'metric_id, entry_date' }
      )
      .select()
      .single()

    if (error) {
      console.error('[API ENTRIES] Upsert Error:', error)
      throw error
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API ENTRIES] Caught Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
