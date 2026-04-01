import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('screening_manual_actuals')
      .select('*')
    
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Actuals fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { test_title, day, field, value } = payload

    if (!test_title || !day || !field) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Since we only want to update one field without overriding the other to 0, 
    // we query first or use a structured upsert safely.
    // Easiest is to select existing row first.
    const { data: existing } = await supabase
      .from('screening_manual_actuals')
      .select('*')
      .eq('test_title', test_title)
      .eq('day', day)
      .single()

    const updatePayload = {
      test_title,
      day,
      l1_actual: existing?.l1_actual ?? 0,
      hires_actual: existing?.hires_actual ?? 0,
      updated_at: new Date().toISOString()
    }

    if (field === 'l1_actual') updatePayload.l1_actual = value
    if (field === 'hires_actual') updatePayload.hires_actual = value

    const { error } = await supabase
      .from('screening_manual_actuals')
      .upsert(updatePayload, { onConflict: 'test_title,day' })

    if (error) throw error
    return NextResponse.json({ success: true, updated: updatePayload })
  } catch (error) {
    console.error('Actuals upsert error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
