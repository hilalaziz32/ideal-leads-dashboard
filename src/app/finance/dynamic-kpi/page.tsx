'use client'

import React, { useEffect, useState } from 'react'
import KPITable from '../components/KPITable'

export default function DynamicKPIsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/kpis?tab=Tab4`)
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

  const handleAddPerson = async () => {
    const name = window.prompt("Enter new person's name:")
    if (!name) return
    const res = await fetch('/api/finance/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_person', payload: { name } })
    })
    if (res.ok) {
      const newPerson = (await res.json())[0]
      setData((prev: any) => ({ ...prev, people: [...prev.people, newPerson] }))
    } else {
      alert("Error adding person. They might already exist.")
    }
  }

  const handleAddKPI = async () => {
    if (!data?.people?.length) {
      alert("Add a person first.")
      return
    }
    const name = window.prompt("Enter new KPI name:")
    if (!name) return
    const personName = window.prompt("Enter exact name of the owner for this KPI:")
    if (!personName) return
    const owner = data.people.find((p: any) => p.name.toLowerCase() === personName.toLowerCase())
    if (!owner) {
      alert("Person not found.")
      return
    }

    const res = await fetch('/api/finance/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_kpi', payload: { name, owner_id: owner.id, tab_source: 'Tab4', target_type: 'weekly' } })
    })
    
    if (res.ok) {
      const newKpi = (await res.json())[0]
      setData((prev: any) => ({
        ...prev,
        kpis: [...prev.kpis, { ...newKpi, targets: [], actuals: [] }]
      }))
    }
  }

  if (loading && !data) return <div style={{ padding: 32 }}>Loading Dynamic Tracker...</div>

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Dynamic KPI Tracker ({year})</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handleAddPerson}
            style={{ padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}
          >
            + Add Person
          </button>
          <button 
            onClick={handleAddKPI}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
          >
            + Add KPI
          </button>
        </div>
      </div>

      {data?.kpis?.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)' }}>
          No dynamic KPIs yet. Add a person and a KPI to get started.
        </div>
      ) : (
        <KPITable 
          year={year}
          people={data?.people || []}
          kpis={data?.kpis || []}
          onUpsertTarget={handleUpsertTarget}
          onUpsertActual={handleUpsertActual}
        />
      )}
    </div>
  )
}
