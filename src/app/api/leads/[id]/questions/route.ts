import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { QuestionAnswer } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { questions } = body as { questions: QuestionAnswer[] }

  const { error } = await supabase
    .from('order_leads')
    .update({ questions, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
