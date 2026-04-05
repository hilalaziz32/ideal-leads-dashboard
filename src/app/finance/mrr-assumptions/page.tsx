'use client'

import React, { useEffect, useState, useMemo } from 'react'
import styles from './mrr-assumptions.module.css'

interface MonthProj {
  id?: string
  year: number
  month: number
  target_placements: number
  avg_mrr_override: number | null
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function MRRAssumptionsPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [globalMrr, setGlobalMrr] = useState<number>(2500)
  const [projections, setProjections] = useState<MonthProj[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/mrr/monthly?year=${year}`)
      const data = await res.json()
      setProjections(data)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (monthIdx: number, field: string, val: string) => {
    const i = projections.findIndex(p => p.month === monthIdx)
    if (i === -1) return
    const numVal = val === '' ? null : parseFloat(val)

    const clone = [...projections]
    clone[i] = { ...clone[i], [field]: numVal }
    setProjections(clone)

    await fetch('/api/finance/mrr/monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year,
        month: monthIdx,
        [field]: numVal
      })
    })
  }

  // Calculate math array
  const mathData = useMemo(() => {
    if (projections.length === 0) return []
    return projections.map(p => {
      const mrr = p.avg_mrr_override !== null ? p.avg_mrr_override : globalMrr
      const projected = (p.target_placements || 0) * mrr
      return { ...p, effectiveMrr: mrr, projected }
    })
  }, [projections, globalMrr])

  const annualTotal = useMemo(() => mathData.reduce((acc, curr) => acc + curr.projected, 0), [mathData])
  const maxMonthly = useMemo(() => Math.max(...mathData.map(m => m.projected), 1000), [mathData])

  if (loading && projections.length === 0) return <div className={styles.container}>Loading Assumptions...</div>

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{year} Monthly MRR Projections</h2>
      
      <div className={styles.topBar}>
        <div className={styles.globalInputGroup}>
          <label className={styles.globalLabel}>Global Average MRR per Placement ($)</label>
          <input 
            type="number" 
            className={styles.globalInput}
            value={globalMrr}
            onChange={e => setGlobalMrr(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Bar Chart Visualizer */}
      <div className={styles.chartWrapper}>
        {mathData.map(m => {
          const heightPct = (m.projected / maxMonthly) * 100
          return (
            <div key={m.month} className={styles.chartBarCol}>
              <div 
                className={styles.bar} 
                style={{ height: `${Math.max(heightPct, 1)}%`, background: m.projected > 0 ? 'var(--accent)' : 'var(--border)' }} 
                title={`$${m.projected.toLocaleString()}`}
              />
              <div className={styles.barLabel}>{months[m.month - 1]}</div>
            </div>
          )
        })}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Month</th>
            <th>Target Placements</th>
            <th>Avg MRR Override ($)</th>
            <th>Projected Monthly MRR</th>
          </tr>
        </thead>
        <tbody>
          {mathData.map(m => (
            <tr key={m.month}>
              <td>{months[m.month - 1]} {year}</td>
              <td>
                <input 
                  type="number"
                  className={styles.cellInput}
                  value={m.target_placements !== null ? m.target_placements : ''}
                  onChange={e => handleUpdate(m.month, 'target_placements', e.target.value)}
                />
              </td>
              <td>
                <input 
                  type="number"
                  className={styles.cellInput}
                  placeholder={globalMrr.toString()}
                  value={m.avg_mrr_override !== null ? m.avg_mrr_override : ''}
                  onChange={e => handleUpdate(m.month, 'avg_mrr_override', e.target.value)}
                />
              </td>
              <td style={{ fontWeight: 600, color: m.projected > 0 ? 'var(--accent)' : 'inherit' }}>
                ${m.projected.toLocaleString()}
              </td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td colSpan={3}>Annual Projected MRR Target</td>
            <td style={{ color: 'var(--accent)' }}>${annualTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
