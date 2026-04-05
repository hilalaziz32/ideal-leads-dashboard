import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase.from('turnaround_custom_statuses').select('*').order('label')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const { label } = await req.json()
    if (!label) return NextResponse.json({ error: 'Label required' }, { status: 400 })

    const { data, error } = await supabase
      .from('turnaround_custom_statuses')
      .insert({ label: label.trim() })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
