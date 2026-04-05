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
    <div style={{ padding: 32, height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>Sales / Recruiting KPIs ({year})</h2>
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
