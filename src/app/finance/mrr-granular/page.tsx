'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import styles from './mrr-granular.module.css'

interface Assump {
  id?: string
  year: number
  quarter: number
  days_before_revenue: number
  new_customers_per_month: number
  avg_mrr_per_customer: number
  january_adjustment_days: number
}

interface DailyRow {
  entry_date: string
  actual_mrr: string | number
  expected_placements: string | number
  actual_placements: string | number
}

// Sub-component for individual inputs in the huge table to prevent full-re-renders
const CellInput = ({ dateStr, field, initialVal, handleUpsert }: any) => {
  const [val, setVal] = useState(initialVal || '')
  useEffect(() => { setVal(initialVal || '') }, [initialVal])

  return (
    <input 
      className={styles.cellInput}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={e => {
        if (e.target.value !== (initialVal||'').toString()) {
          handleUpsert(dateStr, field, e.target.value)
        }
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  )
}

export default function MRRGranularPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [assumptions, setAssumptions] = useState<Assump[]>([])
  const [dailies, setDailies] = useState<Record<string, DailyRow>>({})
  const [loading, setLoading] = useState(true)
  
  const todayStr = new Date().toISOString().split('T')[0]
  const todayRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resA, resD] = await Promise.all([
        fetch(`/api/finance/mrr/assumptions?year=${year}`),
        fetch(`/api/finance/mrr/daily?year=${year}`)
      ])
      const dataA = await resA.json()
      const dataD = await resD.json()
      
      setAssumptions(dataA)
      
      const dict: Record<string, DailyRow> = {}
      ;(dataD || []).forEach((d: any) => {
        dict[d.entry_date] = d
      })
      setDailies(dict)
      
      // Auto-scroll to today
      setTimeout(() => {
        if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500)
    } finally {
      setLoading(false)
    }
  }

  const handleAssumpChange = (q: number, field: string, val: string) => {
    const i = assumptions.findIndex(a => a.quarter === q)
    if (i === -1) return
    const clone = [...assumptions]
    clone[i] = { ...clone[i], [field]: parseFloat(val) || 0 }
    setAssumptions(clone)
  }

  const saveAssump = async (q: number) => {
    const a = assumptions.find(x => x.quarter === q)
    if (!a) return
    await fetch('/api/finance/mrr/assumptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a)
    })
  }

  const handleDailyUpsert = async (dateStr: string, field: string, val: string) => {
    const payload = { entry_date: dateStr, [field]: val }
    
    // Optimistic
    setDailies(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], entry_date: dateStr, [field]: val }
    }))

    await fetch('/api/finance/mrr/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  // Generate the 365 day structure
  const daysInYear = useMemo(() => {
    if (assumptions.length === 0) return []
    
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    const totalDays = isLeap ? 366 : 365
    const dt = new Date(year, 0, 1)
    
    let runningTarget = 0
    const list = []

    for (let i = 0; i < totalDays; i++) {
      const monthIdx = dt.getMonth()
      const dStr = dt.toISOString().split('T')[0]
      const qIdx = Math.floor(monthIdx / 3) + 1
      
      const qAssump = assumptions.find(a => a.quarter === qIdx) || assumptions[0]
      
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
      const monthlyInc = (qAssump.new_customers_per_month || 0) * (qAssump.avg_mrr_per_customer || 0)
      const dailyInc = monthlyInc / daysInMonth
      
      const dayOfMonth = dt.getDate()
      const lagBarrier = (qAssump.days_before_revenue || 0) + (monthIdx === 0 ? (qAssump.january_adjustment_days || 0) : 0)
      
      if (dayOfMonth > lagBarrier) {
        runningTarget += dailyInc
      }

      const dailyEntry = dailies[dStr] || {}
      
      const expectedInc = (parseFloat(dailyEntry.expected_placements as any) || 0) * (qAssump.avg_mrr_per_customer || 0)
      const actualInc = (parseFloat(dailyEntry.actual_placements as any) || 0) * (qAssump.avg_mrr_per_customer || 0)

      list.push({
        dStr,
        monthIdx,
        monthName: dt.toLocaleString('default', { month: 'long' }),
        targetMRR: runningTarget,
        dayOfMonth,
        ...dailyEntry,
        expectedInc,
        actualInc,
        avgMrrRef: qAssump.avg_mrr_per_customer || 0
      })
      
      dt.setDate(dt.getDate() + 1)
    }
    return list
  }, [year, assumptions, dailies])

  if (loading && assumptions.length === 0) return <div style={{padding: 24}}>Loading Assumptions...</div>

  // Create quarter summary objects for the left panel
  const getQ = (q: number) => assumptions.find(a => a.quarter === q) || { new_customers_per_month: 0, days_before_revenue: 0, avg_mrr_per_customer: 0, january_adjustment_days: 0 }
  
  return (
    <div className={styles.container}>
      {/* LEFT PANEL */}
      <div className={styles.leftPanel}>
        <div className={styles.panelSection} style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
          <h2 className={styles.panelTitle} style={{ color: 'var(--text-primary)' }}>Global Config & Q1</h2>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Avg MRR Per Customer</label>
            <input 
              type="number" className={styles.input} 
              value={getQ(1).avg_mrr_per_customer} 
              onChange={e => handleAssumpChange(1, 'avg_mrr_per_customer', e.target.value)}
              onBlur={() => saveAssump(1)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Days Before Revenue</label>
            <input 
              type="number" className={styles.input} 
              value={getQ(1).days_before_revenue} 
              onChange={e => handleAssumpChange(1, 'days_before_revenue', e.target.value)}
              onBlur={() => saveAssump(1)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Jan. Adjustment Days</label>
            <input 
              type="number" className={styles.input} 
              value={getQ(1).january_adjustment_days} 
              onChange={e => handleAssumpChange(1, 'january_adjustment_days', e.target.value)}
              onBlur={() => saveAssump(1)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>New Customers / Mo (Q1)</label>
            <input 
              type="number" className={styles.input} 
              value={getQ(1).new_customers_per_month} 
              onChange={e => handleAssumpChange(1, 'new_customers_per_month', e.target.value)}
              onBlur={() => saveAssump(1)}
            />
          </div>
        </div>

        {[2,3,4].map(q => (
          <div key={q} className={styles.panelSection}>
            <h2 className={styles.panelTitle}>Q{q} Projections</h2>
            <div className={styles.inputGroup}>
              <label className={styles.label}>New Customers / Mo (Q{q})</label>
              <input 
                type="number" className={styles.input} 
                value={getQ(q).new_customers_per_month} 
                onChange={e => handleAssumpChange(q, 'new_customers_per_month', e.target.value)}
                onBlur={() => saveAssump(q)}
              />
            </div>
            {/* Note: In a fully advanced system, each Quarter could decouple the other config vars, but we'll focus simply on new customers overriding here per specs if needed, while keeping the UX clean. */}
          </div>
        ))}
      </div>

      {/* RIGHT PANEL */}
      <div className={styles.rightPanel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Target MRR</th>
              <th>Actual MRR</th>
              <th>Exp. Placements</th>
              <th>Act. Placements</th>
              <th>Exp. MRR Inc.</th>
              <th>Act. MRR Inc.</th>
            </tr>
          </thead>
          <tbody>
            {daysInYear.map((day, idx) => {
              const isFirstOfMonth = day.dayOfMonth === 1
              const isToday = day.dStr === todayStr
              const actualNum = parseFloat(day.actual_mrr as any)
              
              let rowState = ''
              if (isToday) rowState = styles.rowToday
              else if (!isNaN(actualNum)) {
                if (actualNum >= day.targetMRR) rowState = styles.rowGreen
                if (actualNum < day.targetMRR) rowState = styles.rowRed
              }

              return (
                <React.Fragment key={day.dStr}>
                  {isFirstOfMonth && (
                    <tr className={styles.monthHeaderRow}>
                      <th colSpan={7} style={{ background: 'var(--bg-secondary)' }}>
                        {day.monthName} {year}
                      </th>
                    </tr>
                  )}
                  <tr className={rowState} ref={isToday ? todayRef : null}>
                    <td>{day.dStr}</td>
                    <td style={{ color: 'var(--text-muted)' }}>${Math.round(day.targetMRR).toLocaleString()}</td>
                    <td style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <CellInput 
                        dateStr={day.dStr} 
                        field="actual_mrr" 
                        initialVal={day.actual_mrr} 
                        handleUpsert={handleDailyUpsert} 
                      />
                    </td>
                    <td style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <CellInput 
                        dateStr={day.dStr} 
                        field="expected_placements" 
                        initialVal={day.expected_placements} 
                        handleUpsert={handleDailyUpsert} 
                      />
                    </td>
                    <td style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <CellInput 
                        dateStr={day.dStr} 
                        field="actual_placements" 
                        initialVal={day.actual_placements} 
                        handleUpsert={handleDailyUpsert} 
                      />
                    </td>
                    <td style={{ color: day.expectedInc > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                      ${day.expectedInc.toLocaleString()}
                    </td>
                    <td style={{ color: day.actualInc > 0 ? '#2ecc71' : 'var(--text-muted)' }}>
                      ${day.actualInc.toLocaleString()}
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
