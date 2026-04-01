import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('referral_partners')
    .select('*, leads:order_leads(id)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate points dynamically via join
  const formatted = data.map(rp => ({
    id: rp.id,
    name: rp.name,
    points: rp.leads ? rp.leads.length : 0,
    created_at: rp.created_at
  }))

  return NextResponse.json(formatted)
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('referral_partners')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
