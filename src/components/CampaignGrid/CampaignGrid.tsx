'use client'

import React, { useEffect, useState, useMemo } from 'react'
import styles from './campaignGrid.module.css'

interface CampaignGridProps {
  tabType: 'Upwork' | 'Live'
}

const CellInput = ({ metricId, dStr, initialVal, handleEntryUpsert }: any) => {
  const [val, setVal] = useState(initialVal)

  // Sync if database refreshes around it
  useEffect(() => {
    setVal(initialVal)
  }, [initialVal])

  return (
    <input 
      className={styles.cellInput}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      // Only upsert to DB if they actually click away and the value fundamentally changed
      onBlur={(e) => {
        if (e.target.value !== initialVal) {
          handleEntryUpsert(metricId, dStr, e.target.value)
        }
      }}
      // Optional: pressing Enter saves and visually drops focus natively
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

export default function CampaignGrid({ tabType }: CampaignGridProps) {
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [tabType])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns?tab_type=${tabType}`)
      const data = await res.json()
      setRoles(Array.isArray(data) ? data : [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRole = async () => {
    const roleName = prompt('Enter new Role Title (e.g. Senior Backend Developer):')
    if (!roleName) return
    const startDate = prompt('Enter Start Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!startDate) return

    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab_type: tabType, role_name: roleName, start_date: startDate })
      })
      fetchData()
    } catch(err) {
      console.error(err)
    }
  }

  const updateField = async (table: string, id: string, payload: any) => {
    try {
      await fetch('/api/campaigns/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id, payload })
      })
      fetchData() // Refresh to grab updated sorting/names
    } catch(err) {
      console.error(err)
    }
  }

  // Optimize entry upsert without refreshing entire 4 level deep tree UI instantly (causes jumping inputs)
  const handleEntryUpsert = async (metric_id: string, dateStr: string, val: string) => {
    try {
      await fetch('/api/campaigns/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric_id, entry_date: dateStr, entry_value: val })
      })
    } catch(err) {
      console.error(err)
    }
  }

  // --- Date Filtering State ---
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  })

  // --- Dynamic Calendar Loop Calculation ---
  const { dateArray, monthGroups } = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return { dateArray: [], monthGroups: [] }

    const startNode = new Date(dateRange.start)
    const endNode = new Date(dateRange.end)
    startNode.setHours(0,0,0,0)
    endNode.setHours(0,0,0,0)

    const dArray: string[] = []
    let curr = new Date(startNode)
    
    // Safety limit to prevent 10000+ col crashes if they pick 10 years
    let limit = 0
    while (curr <= endNode && limit < 100) {
      dArray.push(curr.toISOString().split('T')[0])
      curr.setDate(curr.getDate() + 1)
      limit++
    }

    const mGroups: Array<{ label: string, colSpan: number }> = []
    let currentMonthStr = ''
    let spanCounter = 0

    dArray.forEach(dStr => {
      const d = new Date(dStr)
      const monthLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' })
      if (monthLabel !== currentMonthStr) {
        if (currentMonthStr !== '') mGroups.push({ label: currentMonthStr, colSpan: spanCounter })
        currentMonthStr = monthLabel
        spanCounter = 1
      } else {
        spanCounter++
      }
    })
    if (currentMonthStr !== '') mGroups.push({ label: currentMonthStr, colSpan: spanCounter })

    return { dateArray: dArray, monthGroups: mGroups }
  }, [dateRange])

  const setFilterMode = (mode: '7' | '14' | 'month') => {
    const end = new Date()
    const start = new Date()
    
    if (mode === '7') {
      start.setDate(end.getDate() - 6)
    } else if (mode === '14') {
      start.setDate(end.getDate() - 13)
    } else if (mode === 'month') {
      start.setDate(1) // 1st of current month
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }

  if (loading) return <div style={{padding: 24}}>Loading tracker grid...</div>

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Top Banner & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <button 
          onClick={handleAddRole} 
          style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: 600 }}
        >
          + Add New Role
        </button>

        <div className={styles.filterBar}>
          <div className={styles.quickFilters}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>VIEW:</span>
            <button className={styles.filterBtn} onClick={() => setFilterMode('7')}>7 Days</button>
            <button className={styles.filterBtn} onClick={() => setFilterMode('14')}>14 Days</button>
            <button className={styles.filterBtn} onClick={() => setFilterMode('month')}>This Month</button>
          </div>
          <div className={styles.customDateFilter}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>CUSTOM:</span>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={dateRange.start}
              onChange={e => setDateRange(p => ({...p, start: e.target.value}))}
            />
            <span style={{color:'var(--text-muted)'}}>—</span>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={dateRange.end}
              onChange={e => setDateRange(p => ({...p, end: e.target.value}))}
            />
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            {/* Month Header Row */}
            <tr>
              <th className={`${styles.fixedLeft} ${styles.colRunning}`}>Running</th>
              <th className={`${styles.fixedLeft2} ${styles.colRole}`}>Role</th>
              <th className={`${styles.fixedLeft3} ${styles.colMetric}`}>Metric</th>
              {monthGroups.map(mg => (
                <th key={mg.label} colSpan={mg.colSpan} className={styles.monthHeader} style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {mg.label}
                </th>
              ))}
            </tr>
            {/* Exact Days Row */}
            <tr>
              <th className={`${styles.fixedLeft} ${styles.colRunning}`}></th>
              <th className={`${styles.fixedLeft2} ${styles.colRole}`}></th>
              <th className={`${styles.fixedLeft3} ${styles.colMetric}`}></th>
              {dateArray.map(dStr => {
                const dayNum = parseInt(dStr.split('-')[2])
                const isToday = dStr === new Date().toISOString().split('T')[0]
                return (
                  <th key={dStr} className={styles.colDate} style={{ background: isToday ? 'rgba(78, 144, 237, 0.1)' : '', color: isToday ? 'var(--accent)' : '' }}>
                    {dayNum}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <React.Fragment key={role.id}>
                {/* 1. ROLE BANNER ROW */}
                <tr className={styles.roleHeaderRow}>
                  <td className={styles.fixedLeft} style={{ background: '#1e3a8a' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select 
                        className={styles.selectNode} 
                        style={{ width: 'auto', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                        value={role.running_status || 'No'}
                        onChange={(e) => updateField('campaign_tracker_roles', role.id, { running_status: e.target.value })}
                      >
                        <option style={{color:'black'}} value="Yes">Yes</option>
                        <option style={{color:'black'}} value="No">No</option>
                      </select>
                    </div>
                  </td>
                  <td className={styles.fixedLeft2} style={{ background: '#1e3a8a' }}>
                    {role.role_name}
                    {tabType === 'Upwork' && (
                      <input 
                        defaultValue={role.annotation || ''}
                        onBlur={(e) => updateField('campaign_tracker_roles', role.id, { annotation: e.target.value })}
                        placeholder="Add annotation..."
                        style={{ display: 'block', marginTop: 4, fontSize: 11, background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '2px 6px', borderRadius: 4, width: '100%' }}
                      />
                    )}
                  </td>
                  <td className={styles.fixedLeft3} style={{ background: '#1e3a8a' }}></td>
                  <td colSpan={dateArray.length} style={{ background: '#1e3a8a' }}></td>
                </tr>

                {/* 2. SOURCES LOOP */}
                {(role.campaign_tracker_sources || []).sort((a:any, b:any) => a.sort_order - b.sort_order).map((source: any) => (
                  <React.Fragment key={source.id}>
                    {/* Source Title Row (SubHeader) */}
                    <tr>
                      <td className={styles.fixedLeft} style={{ background: 'var(--bg-card)' }}>
                        <select 
                          className={`${styles.selectNode} ${source.running_status === 'Yes' ? styles.chipYes : styles.chipNo}`}
                          value={source.running_status || 'No'}
                          onChange={(e) => updateField('campaign_tracker_sources', source.id, { running_status: e.target.value })}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className={styles.fixedLeft2} colSpan={2} style={{ background: 'var(--bg-card)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {source.source_name}
                      </td>
                      <td colSpan={dateArray.length} style={{ background: 'rgba(0,0,0,0.02)' }}></td>
                    </tr>

                    {/* 3. METRICS LOOP */}
                    {(source.campaign_tracker_metrics || []).sort((x:any, y:any) => x.sort_order - y.sort_order).map((metric: any) => {
                      
                      const entryDict: Record<string, string> = {}
                      ;(metric.campaign_tracker_daily_entries || []).forEach((e: any) => {
                        entryDict[e.entry_date] = e.entry_value
                      })

                      return (
                        <tr key={metric.id}>
                          <td className={styles.fixedLeft} style={{ background: 'var(--bg-card)' }}></td>
                          <td className={styles.fixedLeft2} style={{ background: 'var(--bg-card)' }}></td>
                          <td className={styles.fixedLeft3} style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                            └ {metric.metric_name}
                          </td>
                          
                          {/* 4. ACTUAL DATES ITERATOR */}
                          {dateArray.map(dStr => {
                            const val = entryDict[dStr] || ''
                            const isToday = dStr === new Date().toISOString().split('T')[0]
                            const isBeforeStart = role.start_date && dStr < role.start_date

                            return (
                              <td key={dStr} style={{ padding: 2, background: isToday ? 'rgba(78, 144, 237, 0.05)' : (isBeforeStart ? 'rgba(0,0,0,0.02)' : '') }}>
                                <CellInput 
                                  metricId={metric.id}
                                  dStr={dStr}
                                  initialVal={val}
                                  handleEntryUpsert={handleEntryUpsert}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {roles.length === 0 && (
              <tr>
                <td colSpan={dateArray.length + 3} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  No automated roles found for {tabType}. Click "+ Add New Role" to initialize the database grid.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
