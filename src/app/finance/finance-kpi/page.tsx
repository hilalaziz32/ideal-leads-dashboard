'use client'

import React, { useEffect, useState } from 'react'
import KPITable from '../components/KPITable'

export default function FinanceKPIsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/kpis?tab=Tab5`)
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  const handleUpsertTarget = async (kpiId: string, dateStr: string, val: string) => {
    const num = val === '' ? null : parseFloat(val)
    setData((prev: any) => {
      const clone = { ...prev }
      const kpi = clone.kpis.find((k: any) => k.id === kpiId)
      if (kpi) {
        const existIdx = kpi.targets.findIndex((t: any) => t.date_start === dateStr)
        if (existIdx > -1) kpi.targets[existIdx].target_value = num
        else kpi.targets.push({ kpi_id: kpiId, date_start: dateStr, target_value: num })
      }
      return clone
    })
    await fetch('/api/finance/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_target', payload: { kpi_id: kpiId, date_start: dateStr, target_value: num } })
    })
  }

  const handleUpsertActual = async (kpiId: string, dateStr: string, val: string) => {
    const num = val === '' ? null : parseFloat(val)
    setData((prev: any) => {
      const clone = { ...prev }
      const kpi = clone.kpis.find((k: any) => k.id === kpiId)
      if (kpi) {
        const existIdx = kpi.actuals.findIndex((a: any) => a.date_start === dateStr)
        if (existIdx > -1) kpi.actuals[existIdx].actual_value = num
        else kpi.actuals.push({ kpi_id: kpiId, date_start: dateStr, actual_value: num })
      }
      return clone
    })
    await fetch('/api/finance/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_actual', payload: { kpi_id: kpiId, date_start: dateStr, actual_value: num } })
    })
  }

  if (loading && !data) return <div style={{ padding: 32 }}>Loading Finance KPIs...</div>

  // Create summary cards logic
  const renderCards = () => {
    if (!data?.kpis) return null

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
        {data.kpis.map((kpi: any) => {
          const ownerName = data.people.find((p: any) => p.id === kpi.owner_id)?.name || 'Unknown'

          // Get most recent targets and actuals (simplified for now to just picking latest entry for display)
          // A real implementation would sum the current month precisely.
          const latestActual = kpi.actuals[kpi.actuals.length - 1]?.actual_value || 0
          const latestTarget = kpi.targets[kpi.targets.length - 1]?.target_value || 0

          let statusColor = 'var(--border)'
          if (latestTarget > 0) {
            statusColor = latestActual >= latestTarget ? '#2ecc71' : '#e74c3c'
          }

          return (
            <div key={kpi.id} style={{ 
              background: 'var(--bg-card)', 
              border: `2px solid ${statusColor}`, 
              borderRadius: 8, 
              padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Owner: {ownerName}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, minHeight: 40 }}>
                {kpi.name}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Current Actual</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{latestActual}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Monthly Target</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>{latestTarget}</div>
                </div>
              </div>

              {/* Fake 6-mo sparkline for visual mockup */}
              <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end' }}>
                {[30, 45, 25, 60, 50, 80].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: 'var(--border)', height: `${h}%`, borderRadius: '2px 2px 0 0' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>Finance KPIs ({year})</h2>
      
      {renderCards()}

      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Weekly Detail Table</h3>
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
