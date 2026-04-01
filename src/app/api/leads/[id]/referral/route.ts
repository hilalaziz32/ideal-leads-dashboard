import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { referral_id } = await req.json()
    // referral_id can be a UUID or null
    
    const { error } = await supabase
      .from('order_leads')
      .update({ referral_id: referral_id || null })
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
