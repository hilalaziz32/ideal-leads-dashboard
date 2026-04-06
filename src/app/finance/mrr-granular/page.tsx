'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
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

// Editable fields in order — Tab will cycle through these per row
const EDITABLE_FIELDS = ['actual_mrr', 'expected_placements', 'actual_placements'] as const
type EditableField = typeof EDITABLE_FIELDS[number]

interface CellInputProps {
  dateStr: string
  field: EditableField
  initialVal: string | number
  handleUpsert: (dateStr: string, field: string, val: string) => Promise<void>
  onTabNext: () => void   // Tab → next cell
  onTabPrev: () => void   // Shift+Tab → prev cell
  inputRef: (el: HTMLInputElement | null) => void
}

// Sub-component: prevents full-page re-renders on keystrokes
const CellInput = ({ dateStr, field, initialVal, handleUpsert, onTabNext, onTabPrev, inputRef }: CellInputProps) => {
  const [val, setVal] = useState(String(initialVal ?? ''))
  useEffect(() => { setVal(String(initialVal ?? '')) }, [initialVal])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
      onTabNext()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        onTabPrev()
      } else {
        onTabNext()
      }
    }
  }

  return (
    <input
      ref={inputRef}
      className={styles.cellInput}
      type="number"
      value={val}
      placeholder="—"
      onChange={e => setVal(e.target.value)}
      onBlur={e => {
        const prev = String(initialVal ?? '')
        if (e.target.value !== prev) {
          handleUpsert(dateStr, field, e.target.value)
        }
      }}
      onKeyDown={handleKeyDown}
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

  // Flat registry: "YYYY-MM-DD:field" → input element
  const cellRegistry = useRef<Map<string, HTMLInputElement>>(new Map())

  const registerCell = useCallback((dateStr: string, field: string) => (el: HTMLInputElement | null) => {
    const key = `${dateStr}:${field}`
    if (el) cellRegistry.current.set(key, el)
    else cellRegistry.current.delete(key)
  }, [])

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
      ;(dataD || []).forEach((d: any) => { dict[d.entry_date] = d })
      setDailies(dict)
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 400)
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
    setDailies(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], entry_date: dateStr, [field]: val }
    }))
    await fetch('/api/finance/mrr/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_date: dateStr, [field]: val })
    })
  }

  // Tab navigation: move to the next/prev cell in flat order (date × field)
  const makeFocusCellFn = (daysInYear: any[]) => {
    // Build flat key list once
    const keys: string[] = []
    for (const day of daysInYear) {
      for (const f of EDITABLE_FIELDS) {
        keys.push(`${day.dStr}:${f}`)
      }
    }
    return {
      focusNext: (dateStr: string, field: string) => {
        const idx = keys.indexOf(`${dateStr}:${field}`)
        if (idx === -1 || idx >= keys.length - 1) return
        cellRegistry.current.get(keys[idx + 1])?.focus()
      },
      focusPrev: (dateStr: string, field: string) => {
        const idx = keys.indexOf(`${dateStr}:${field}`)
        if (idx <= 0) return
        cellRegistry.current.get(keys[idx - 1])?.focus()
      }
    }
  }

  // Generate 365/366 rows
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
      if (dayOfMonth > lagBarrier) runningTarget += dailyInc
      const dailyEntry = dailies[dStr] || {}
      const expectedInc = (parseFloat(dailyEntry.expected_placements as any) || 0) * (qAssump.avg_mrr_per_customer || 0)
      const actualInc   = (parseFloat(dailyEntry.actual_placements as any)   || 0) * (qAssump.avg_mrr_per_customer || 0)
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

  const nav = useMemo(() => makeFocusCellFn(daysInYear), [daysInYear])

  if (loading && assumptions.length === 0) return (
    <div style={{ padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
  )

  const getQ = (q: number) => assumptions.find(a => a.quarter === q) || { new_customers_per_month: 0, days_before_revenue: 0, avg_mrr_per_customer: 0, january_adjustment_days: 0 }

  return (
    <div className={styles.container}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.leftPanel}>
        {/* Year selector */}
        <div className={styles.yearStrip}>
          <button className={styles.yearBtn} onClick={() => setYear(y => y - 1)}>‹</button>
          <span className={styles.yearLabel}>{year}</span>
          <button className={styles.yearBtn} onClick={() => setYear(y => y + 1)}>›</button>
        </div>

        {/* Q1 / Global config */}
        <div className={styles.panelSection} style={{ background: 'var(--bg-secondary)' }}>
          <div className={styles.panelTitle}>Global Config + Q1</div>
          {[
            { field: 'avg_mrr_per_customer',    label: 'Avg MRR / Customer' },
            { field: 'days_before_revenue',     label: 'Days Before Revenue' },
            { field: 'january_adjustment_days', label: 'Jan Adjustment Days' },
            { field: 'new_customers_per_month', label: 'New Customers / Mo (Q1)' },
          ].map(({ field, label }) => (
            <div className={styles.inputGroup} key={field}>
              <label className={styles.label}>{label}</label>
              <input
                type="number"
                className={styles.input}
                value={(getQ(1) as any)[field]}
                onChange={e => handleAssumpChange(1, field, e.target.value)}
                onBlur={() => saveAssump(1)}
              />
            </div>
          ))}
        </div>

        {/* Q2–Q4 */}
        {[2, 3, 4].map(q => (
          <div key={q} className={styles.panelSection}>
            <div className={styles.panelTitle}>Q{q} Projections</div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>New Customers / Mo (Q{q})</label>
              <input
                type="number"
                className={styles.input}
                value={getQ(q).new_customers_per_month}
                onChange={e => handleAssumpChange(q, 'new_customers_per_month', e.target.value)}
                onBlur={() => saveAssump(q)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── RIGHT TABLE ── */}
      <div className={styles.rightPanel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Target MRR</th>
              <th>Actual MRR ✎</th>
              <th>Exp. Placements ✎</th>
              <th>Act. Placements ✎</th>
              <th>Exp. MRR Inc.</th>
              <th>Act. MRR Inc.</th>
            </tr>
          </thead>
          <tbody>
            {daysInYear.map((day) => {
              const isFirstOfMonth = day.dayOfMonth === 1
              const isToday = day.dStr === todayStr
              const actualNum = parseFloat(day.actual_mrr as any)

              let rowClass = ''
              if (isToday) rowClass = styles.rowToday
              else if (!isNaN(actualNum)) {
                rowClass = actualNum >= day.targetMRR ? styles.rowGreen : styles.rowRed
              }

              return (
                <React.Fragment key={day.dStr}>
                  {isFirstOfMonth && (
                    <tr className={styles.monthHeaderRow}>
                      <th colSpan={7}>{day.monthName} {year}</th>
                    </tr>
                  )}
                  <tr className={rowClass} ref={isToday ? todayRef : null}>
                    <td>{day.dStr}</td>
                    <td><span>${Math.round(day.targetMRR).toLocaleString()}</span></td>
                    {EDITABLE_FIELDS.map(field => (
                      <td key={field}>
                        <CellInput
                          dateStr={day.dStr}
                          field={field}
                          initialVal={(day as any)[field]}
                          handleUpsert={handleDailyUpsert}
                          onTabNext={() => nav.focusNext(day.dStr, field)}
                          onTabPrev={() => nav.focusPrev(day.dStr, field)}
                          inputRef={registerCell(day.dStr, field)}
                        />
                      </td>
                    ))}
                    <td><span style={{ color: day.expectedInc > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>${day.expectedInc.toLocaleString()}</span></td>
                    <td><span style={{ color: day.actualInc > 0 ? 'var(--success)' : 'var(--text-muted)' }}>${day.actualInc.toLocaleString()}</span></td>
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
