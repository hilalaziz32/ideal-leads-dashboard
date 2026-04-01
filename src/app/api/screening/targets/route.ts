import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('screening_test_targets')
      .select('*')
    
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Target fetch error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { 
      test_title, target_completed, target_passed, target_l1, target_hires, target_days 
    } = payload

    if (!test_title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const { error } = await supabase
      .from('screening_test_targets')
      .upsert({
        test_title,
        target_completed: target_completed ?? 0,
        target_passed: target_passed ?? 0,
        target_l1: target_l1 ?? 0,
        target_hires: target_hires ?? 0,
        target_days: target_days ?? [1,2,3,4,5], // by default weekday
        updated_at: new Date().toISOString()
      }, { onConflict: 'test_title' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Target upsert error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
