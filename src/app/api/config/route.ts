import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('dashboard_config')
      .select('config_key, config_value')
    
    if (error) throw error

    // Transform into standard key-value map
    const config = (data || []).reduce((acc: Record<string, number>, item) => {
      acc[item.config_key] = Number(item.config_value)
      return acc
    }, {})

    return NextResponse.json(config)
  } catch (error) {
    console.error('Config fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { updates } = body as { updates: Record<string, number> }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Missing updates object' }, { status: 400 })
    }

    // Process updates in sequence or parallel
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await supabase
        .from('dashboard_config')
        .update({ config_value: value, updated_at: new Date().toISOString() })
        .eq('config_key', key)

      if (error) {
        console.error(`Failed to update config ${key}:`, error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Config update error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
