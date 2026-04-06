'use client'

import React, { useEffect, useState } from 'react'
import KPITable from '../components/KPITable'

export default function SalesKPIsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/kpis?tab=Tab3`)
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  const handleUpsertTarget = async (kpiId: string, dateStr: string, val: string) => {
    // Optimistic UI
    const num = val === '' ? null : parseFloat(val)
    setData((prev: any) => {
      const clone = { ...prev }
      const kpi = clone.kpis.find((k: any) => k.id === kpiId)
      if (kpi) {
        const existIdx = kpi.targets.findIndex((t: any) => t.date_start === dateStr)
        if (existIdx > -1) {
          kpi.targets[existIdx].target_value = num
        } else {
          kpi.targets.push({ kpi_id: kpiId, date_start: dateStr, target_value: num })
        }
      }
      return clone
    })

    await fetch('/api/finance/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_target',
        payload: { kpi_id: kpiId, date_start: dateStr, target_value: num }
      })
    })
  }

  const handleUpsertActual = async (kpiId: string, dateStr: string, val: string) => {
    // Optimistic UI
    const num = val === '' ? null : parseFloat(val)
    setData((prev: any) => {
      const clone = { ...prev }
      const kpi = clone.kpis.find((k: any) => k.id === kpiId)
      if (kpi) {
        const existIdx = kpi.actuals.findIndex((a: any) => a.date_start === dateStr)
        if (existIdx > -1) {
          kpi.actuals[existIdx].actual_value = num
        } else {
          kpi.actuals.push({ kpi_id: kpiId, date_start: dateStr, actual_value: num })
        }
      }
      return clone
    })

    await fetch('/api/finance/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_actual',
        payload: { kpi_id: kpiId, date_start: dateStr, actual_value: num }
      })
    })
  }

  if (loading && !data) return <div style={{ padding: 32 }}>Loading Sales KPIs...</div>

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Sales / Recruiting KPIs</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
          <button onClick={() => setYear(y => y - 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono-display)', color: 'var(--text-primary)' }}>{year}</span>
          <button onClick={() => setYear(y => y + 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>›</button>
        </div>
      </div>
      <KPITable 
        year={year}
        people={data?.people || []}
        kpis={data?.kpis || []}
        onUpsertTarget={handleUpsertTarget}
        onUpsertActual={handleUpsertActual}
      />
    </div>
  )
}
