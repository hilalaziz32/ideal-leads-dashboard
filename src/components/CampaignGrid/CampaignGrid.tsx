'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import styles from './campaignGrid.module.css'
import StatCard from '@/components/StatCard/StatCard'

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
  const [screeningStats, setScreeningStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Collapsing state (Starting with empty sets = all collapsed by default)
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  const toggleRole = (id: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    fetchData()
  }, [tabType])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        fetch(`/api/campaigns?tab_type=${tabType}`),
        fetch('/api/screening-stats')
      ])
      const data = await res.json()
      const statsData = await statsRes.json()
      
      setRoles(Array.isArray(data) ? data : [])
      setScreeningStats(Array.isArray(statsData) ? statsData : [])
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

  const handleDeleteRole = async (id: string, roleName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the role "${roleName}" and all its metrics?`)) return
    
    try {
      await fetch(`/api/campaigns?id=${id}`, {
        method: 'DELETE'
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

  // Aggregate stats for StatCards
  const stats = useMemo(() => {
    if (roles.length === 0) return null

    const activeCount = roles.filter(r => r.running_status === 'Yes').length
    
    // Calculate 7-day volume
    let totalApps = 0
    let totalPassed = 0
    let totalSucceed = 0
    const volumeData: any[] = []

    dateArray.forEach(dStr => {
      let dailyTotal = 0
      roles.forEach(role => {
        const stat = screeningStats.find(s => s.test_title === role.role_name && s.day === dStr)
        if (stat) {
          dailyTotal += stat.submitted_count
          totalApps += stat.submitted_count
          totalPassed += stat.passed_count
        }

        // Aggregate manual "Succeed" entries
        ;(role.campaign_tracker_sources || []).forEach((src: any) => {
          ;(src.campaign_tracker_metrics || []).forEach((m: any) => {
            if (m.metric_name === 'Succeed') {
              const entry = (m.campaign_tracker_daily_entries || []).find((e: any) => e.entry_date === dStr)
              if (entry) totalSucceed += (parseFloat(entry.entry_value) || 0)
            }
          })
        })
      })
      volumeData.push({ date: dStr.split('-')[2], value: dailyTotal })
    })

    const passRate = totalApps > 0 ? Math.round((totalPassed / totalApps) * 100) : 0

    return { activeCount, totalApps, passRate, totalSucceed, volumeData }
  }, [roles, screeningStats, dateArray])

  if (loading) return <div style={{padding: 40, color: 'var(--text-muted)' }}>Loading tracker grid...</div>

  return (
    <div className={styles.container}>
      <header>
        <div className={styles.dashboardHeader}>
          <StatCard 
            title="Active Campaigns" 
            value={stats?.activeCount || 0}
            change={2}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          />
          <StatCard 
            title="Total Applications (Screened)" 
            value={stats?.totalApps || 0}
            trend={stats?.volumeData}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
          />
          <StatCard 
            title="Screening Pass Rate" 
            value={`${stats?.passRate || 0}%`}
            change={stats?.passRate && stats.passRate > 50 ? 5 : -2}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          />
          <StatCard 
            title="Total Successes" 
            value={stats?.totalSucceed || 0}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
          />
        </div>

        <div className={styles.filterBar}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button onClick={handleAddRole} className={styles.addBtn}>+ New Role</button>
            <div className={styles.quickFilters}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PRESETS</span>
              <button className={styles.filterBtn} onClick={() => setFilterMode('7')}>7D</button>
              <button className={styles.filterBtn} onClick={() => setFilterMode('14')}>14D</button>
              <button className={styles.filterBtn} onClick={() => setFilterMode('month')}>Month</button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CUSTOM RANGE</span>
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
      </header>

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
            {roles.map(role => {
              const roleExpanded = expandedRoles.has(role.id)
              
              return (
              <React.Fragment key={role.id}>
                {/* 1. ROLE BANNER ROW */}
                <tr className={styles.roleHeaderRow}>
                  <td className={`${styles.fixedLeft} ${styles.cellPadding}`} style={{ background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => toggleRole(role.id)} className={styles.collapseBtn}>
                        {roleExpanded ? '▼' : '▶'}
                      </button>
                      <select 
                        className={`${styles.selectNode} ${role.running_status === 'Yes' ? styles.chipYes : styles.chipNo}`}
                        value={role.running_status || 'No'}
                        onChange={(e) => updateField('campaign_tracker_roles', role.id, { running_status: e.target.value })}
                      >
                         <option value="Yes">Yes</option>
                         <option value="No">No</option>
                      </select>
                    </div>
                  </td>
                  <td className={`${styles.fixedLeft2} ${styles.cellPadding}`} style={{ background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{role.role_name}</span>
                      <button 
                        onClick={() => handleDeleteRole(role.id, role.role_name)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                        title="Delete Role"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                    {tabType === 'Upwork' && (
                      <input 
                        defaultValue={role.annotation || ''}
                        onBlur={(e) => updateField('campaign_tracker_roles', role.id, { annotation: e.target.value })}
                        placeholder="Add annotation..."
                        style={{ display: 'block', marginTop: 8, fontSize: 11, background: 'var(--bg-primary)', border: `1px solid var(--border)`, color: 'var(--text-primary)', padding: '2px 6px', borderRadius: 4, width: '100%' }}
                      />
                    )}
                  </td>
                  <td className={`${styles.fixedLeft3} ${styles.cellPadding}`} style={{ background: 'var(--bg-secondary)' }}></td>
                  {/* Localized Date Header for Each Role Card */}
                  {dateArray.map(dStr => {
                    const dayNum = parseInt(dStr.split('-')[2])
                    const isToday = dStr === new Date().toISOString().split('T')[0]
                    return (
                      <td key={dStr} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-muted)', background: 'var(--bg-secondary)', borderBottom: `1px solid var(--border)` }}>
                        {dayNum}
                      </td>
                    )
                  })}
                </tr>

                {!roleExpanded && (
                  /* Note: UI logic change: user wants to see nothing by default, 
                     so if NOT expanded, we show nothing. Wait, the user said 
                     "default view should be like this" pointing to a collapsed list.
                     Actually, if roleExpanded is true, we show sources.
                  */
                  null
                )}

                {roleExpanded && (role.campaign_tracker_sources || []).sort((a:any, b:any) => a.sort_order - b.sort_order).map((source: any) => {
                  const sourceExpanded = expandedSources.has(source.id)
                  
                  return (
                  <React.Fragment key={source.id}>
                    {/* Source Title Row (SubHeader) */}
                    <tr className={styles.sourceHeaderRow}>
                      <td className={styles.fixedLeft} style={{ background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button onClick={() => toggleSource(source.id)} className={styles.collapseBtn} style={{ color: 'var(--accent)' }}>
                            {sourceExpanded ? '▼' : '▶'}
                          </button>
                          <select 
                            className={`${styles.selectNode} ${source.running_status === 'Yes' ? styles.chipYes : styles.chipNo}`}
                            value={source.running_status || 'No'}
                            onChange={(e) => updateField('campaign_tracker_sources', source.id, { running_status: e.target.value })}
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </td>
                      <td className={styles.fixedLeft2} colSpan={2} style={{ background: 'var(--bg-card)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {source.source_name}
                      </td>
                      <td colSpan={dateArray.length}></td>
                    </tr>

                    {/* 3. METRICS LOOP */}
                    {sourceExpanded && (source.campaign_tracker_metrics || []).sort((x:any, y:any) => x.sort_order - y.sort_order).map((metric: any) => {
                      
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
                          
                            {dateArray.map(dStr => {
                              let val = entryDict[dStr] || ''
                              
                              // Automatically pull from Screening Dashboard ONLY for Upwork tab
                              // Live Tracker remains strictly manual per user request
                              if (tabType === 'Upwork') {
                                if (metric.metric_name === 'Completed Screening (daily)') {
                                  const stat = screeningStats.find(s => s.test_title === role.role_name && s.day === dStr)
                                  if (stat && stat.submitted_count > 0) {
                                    val = stat.submitted_count.toString()
                                  }
                                } else if (metric.metric_name === 'Passed Screening') {
                                  const stat = screeningStats.find(s => s.test_title === role.role_name && s.day === dStr)
                                  if (stat && stat.passed_count > 0) {
                                    val = stat.passed_count.toString()
                                  }
                                }
                              }
                              // "Succeed" is now strictly manual (per user request)

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
                    })}</React.Fragment>
                  )
                })}</React.Fragment>
              )
            })}

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
