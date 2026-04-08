'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { LeadWithOverdue } from '@/lib/types'
import styles from './dashboard.module.css'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts'

interface ScreeningManualActual {
  test_title: string
  day: string
  l1_actual: number
  hires_actual: number
}

interface ScreeningTestTarget {
  test_title: string
  target_completed: number
  target_passed: number
  target_l1: number
  target_hires: number
  target_days: number[]
}

interface ScreeningStat {
  day: string
  job_name: string | null
  test_title: string
  submitted_count: number
  passed_count: number
  failed_count: number
  disqualified_count: number
}

function isWebsiteSource(source: string | null) {
  if (!source) return false
  source = source.toLowerCase()
  return source.includes('.') && !source.includes(' ')
}

function isMetaSource(source: string | null) {
  if (!source) return false
  source = source.toLowerCase()
  return source.includes('facebook') || source.includes('instagram') || source.includes('meta')
}

function generateDates(days = 14) {
  const dates: Date[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d)
  }
  return dates
}

function fmtDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function isToday(d: Date) {
  return isSameDay(d, new Date())
}

type Tab = 'leads' | 'screening'

export default function MetricsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('leads')
  const [leads, setLeads] = useState<LeadWithOverdue[]>([])
  const [screeningStats, setScreeningStats] = useState<ScreeningStat[]>([])
  const [config, setConfig] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [isEditingTargets, setIsEditingTargets] = useState(false)
  const [configDraft, setConfigDraft] = useState<Record<string, number>>({})
  const [leadsManualActuals, setLeadsManualActuals] = useState<any[]>([])
  const [screeningManualActuals, setScreeningManualActuals] = useState<ScreeningManualActual[]>([])
  const [screeningTargets, setScreeningTargets] = useState<ScreeningTestTarget[]>([])
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({})
  const [editingTestTarget, setEditingTestTarget] = useState<string | null>(null)
  const [testTargetDraft, setTestTargetDraft] = useState<ScreeningTestTarget | null>(null)

  const dates = useMemo(() => generateDates(14), [])

  // Cell registry for Tab/Enter keyboard nav on the Leads actuals grid
  // Key format: "metric_type:date_index"
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const registerCell = useCallback((metricType: string, dateIdx: number) => (el: HTMLInputElement | null) => {
    const key = `${metricType}:${dateIdx}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }, [])

  const METRIC_ROWS = ['all', 'website', 'referral', 'reorder'] as const
  const TOTAL_DATE_COUNT = 14

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, metricType: string, dateIdx: number) => {
    if (e.key !== 'Tab' && e.key !== 'Enter') return
    e.preventDefault()
    const direction = e.shiftKey ? -1 : 1
    const metrics = METRIC_ROWS as unknown as string[]
    const mIdx = metrics.indexOf(metricType)
    // Flat index: row * 14 + col
    const flat = mIdx * TOTAL_DATE_COUNT + dateIdx
    const nextFlat = flat + direction
    const nextM = Math.floor(nextFlat / TOTAL_DATE_COUNT)
    const nextD = nextFlat % TOTAL_DATE_COUNT
    if (nextM < 0 || nextM >= metrics.length) return
    if (nextD < 0 || nextD >= TOTAL_DATE_COUNT) return
    cellRefs.current.get(`${metrics[nextM]}:${nextD}`)?.focus()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [leadsRes, screeningRes, configRes, manualRes, targetsRes, leadsManualRes, turnaroundRes] = await Promise.all([
        fetch('/api/leads').then(r => r.json()),
        fetch('/api/screening-stats').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/screening/actuals').then(r => r.json()),
        fetch('/api/screening/targets').then(r => r.json()),
        fetch('/api/leads-actuals').then(r => r.json()),
        fetch('/api/turnaround/roles').then(r => r.json())
      ])
      if (Array.isArray(leadsRes)) setLeads(leadsRes)
      if (Array.isArray(screeningRes)) setScreeningStats(screeningRes)
      if (configRes && !configRes.error) {
        setConfig(configRes)
        setConfigDraft(configRes)
      }
      if (Array.isArray(manualRes)) setScreeningManualActuals(manualRes)
      if (Array.isArray(targetsRes)) setScreeningTargets(targetsRes)
      if (Array.isArray(leadsManualRes)) setLeadsManualActuals(leadsManualRes)
      if (Array.isArray(turnaroundRes)) {
         // Create dummy screening stats so that active roles appear as tests even without Zapier data
         const activeRoles = turnaroundRes.filter((r: any) => r.status === 'Active' && r.role && r.role.trim() !== '')
         setScreeningStats(prev => {
            const copy = [...prev]
            activeRoles.forEach((r: any) => {
               const exists = copy.find(s => s.test_title === r.role)
               if (!exists) {
                  // Push a dummy 0-count row for today to force the title into the testTitles memo
                  copy.push({
                     day: new Date().toISOString().split('T')[0],
                     job_name: r.role,
                     test_title: r.role,
                     submitted_count: 0,
                     passed_count: 0,
                     failed_count: 0,
                     disqualified_count: 0
                  })
               }
            })
            return copy
         })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveConfig = async () => {
    setIsEditingTargets(false)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: configDraft })
      })
      setConfig(configDraft) // Optimistic update
    } catch (err) {
      console.error(err)
    }
  }

  const handleLeadsManualActualChange = async (dayString: string, metricType: string, val: string) => {
    const value = val === '' ? null : parseInt(val, 10)
    
    setLeadsManualActuals((prev: any[]) => {
      const exists = prev.find(x => x.day === dayString && x.metric_type === metricType)
      if (exists) {
        return prev.map(x => (x.day === dayString && x.metric_type === metricType) ? { ...x, value } : x)
      } else {
        return [...prev, { day: dayString, metric_type: metricType, value }]
      }
    })

    try {
      await fetch('/api/leads-actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: dayString, metric_type: metricType, value })
      })
    } catch (err) {
      console.error(err)
    }
  }

  
  const handleToggleTest = (title: string) => {
    setExpandedTests(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const handleManualActualUpdate = async (test_title: string, dayISO: string, field: 'l1_actual' | 'hires_actual', val: string) => {
    let value = parseInt(val)
    if (isNaN(value)) value = 0

    // optimistic
    setScreeningManualActuals(prev => {
      const existing = prev.find(p => p.test_title === test_title && p.day === dayISO)
      if (existing) {
        return prev.map(p => p.test_title === test_title && p.day === dayISO ? { ...p, [field]: value } : p)
      }
      return [...prev, { test_title, day: dayISO, l1_actual: field === 'l1_actual' ? value : 0, hires_actual: field === 'hires_actual' ? value : 0 }]
    })

    await fetch('/api/screening/actuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_title, day: dayISO, field, value })
    })
  }

  const handleSaveTestTarget = async () => {
    if (!testTargetDraft) return
    setEditingTestTarget(null)

    // optimistic
    setScreeningTargets(prev => {
      const idx = prev.findIndex(p => p.test_title === testTargetDraft.test_title)
      if (idx > -1) {
        const copy = [...prev]
        copy[idx] = testTargetDraft
        return copy
      }
      return [...prev, testTargetDraft]
    })

    await fetch('/api/screening/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTargetDraft)
    })
  }

  // ── Leads KPI rollups ──
  const totalLeads = leads.length
  const metaLeads = leads.filter((l) => isMetaSource(l.source)).length
  const websiteLeads = leads.filter((l) => isWebsiteSource(l.source)).length
  const referralLeads = leads.filter((l) => l.source?.toLowerCase().includes('referral')).length

  const leadChartData = useMemo(() => {
    return dates.map(d => {
      const dayLeads = leads.filter(l => isSameDay(new Date(l.created_at), d))
      return {
        date: fmtDate(d),
        Meta: dayLeads.filter(l => isMetaSource(l.source)).length,
        Website: dayLeads.filter(l => isWebsiteSource(l.source)).length,
        Referral: dayLeads.filter(l => l.source?.toLowerCase().includes('referral')).length,
        Other: dayLeads.filter(l => !isMetaSource(l.source) && !isWebsiteSource(l.source) && !l.source?.toLowerCase().includes('referral')).length
      }
    })
  }, [dates, leads])

  // ── Target Derivations ──
  const metaDaily = config['target_meta_daily'] || 20
  const websiteWeekly = config['target_website_weekly'] || 1
  const activeClients = config['active_clients_count'] || 100
  const refPct = config['target_referral_pct'] || 0.15
  const reorderPct = config['target_reorder_pct'] || 0.07

  const projectedReferral = Math.round(activeClients * refPct)
  const projectedReorder = Math.round(activeClients * reorderPct)

  // ── Screening ──
  const last14Days = useMemo(() => dates.map(fmtISO), [dates])
  const screeningLast14 = useMemo(
    () => screeningStats.filter((s) => last14Days.includes(s.day)),
    [screeningStats, last14Days]
  )
  const testTitles = useMemo(() => [...new Set(screeningStats.map((s) => s.test_title))].sort(), [screeningStats])

  const testSummary = useMemo(() => {
    return testTitles.map((title) => {
      const rows = screeningLast14.filter((s) => s.test_title === title)
      const job = rows.find((r) => r.job_name)?.job_name ?? null
      return {
        title,
        job,
        submitted: rows.reduce((a, r) => a + r.submitted_count, 0),
        passed: rows.reduce((a, r) => a + r.passed_count, 0),
        failed: rows.reduce((a, r) => a + r.failed_count, 0),
      }
    })
  }, [testTitles, screeningLast14])


  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading_spinner}>
          <div className={styles.spinner} />
          <span>Synchronizing System...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Overview</h1>
          <p className={styles.pageSubtitle}>14-Day Performance Aggregate</p>
        </div>
      </div>

      <div className={styles.tabStrip}>
        <button
          className={`${styles.tab} ${activeTab === 'leads' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('leads')}
        >
          Leads Target Matrix
          <span className={styles.tabCount}>{totalLeads}</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'screening' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('screening')}
        >
          Screening Analytics
          <span className={styles.tabCount}>{testTitles.length}</span>
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'leads' && (
          <div className="fade-in">
            {/* KPI Summary Cards */}
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Total Leads (14d)</div>
                <div className={styles.kpiValue}>{totalLeads}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Meta Leads</div>
                <div className={styles.kpiValue} style={{ color: 'var(--purple)' }}>{metaLeads}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Website Leads</div>
                <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>{websiteLeads}</div>
              </div>
              <div className={styles.kpiCard}>
                <div className={styles.kpiLabel}>Referrals</div>
                <div className={styles.kpiValue} style={{ color: 'var(--warning)' }}>{referralLeads}</div>
              </div>
            </div>
            <div className={styles.chartContainer}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.chartTitle}>Lead Origin Volume Tracker</h3>
                  <p className={styles.chartSubtitle}>Cumulative entry points visualized against time</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={leadChartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <RechartsTooltip cursor={{ fill: 'var(--bg-secondary)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                    <Bar dataKey="Meta" stackId="a" fill="var(--purple)" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Website" stackId="a" fill="var(--success)" />
                    <Bar dataKey="Referral" stackId="a" fill="var(--warning)" />
                    <Bar dataKey="Other" stackId="a" fill="var(--border-hover)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Target Settings */}
            <div className={styles.sectionTitle} style={{ justifyContent: 'space-between' }}>
              <span>Database Targets & Projections</span>
              {!isEditingTargets && (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => setIsEditingTargets(true)}>
                  Configure Matrix
                </button>
              )}
            </div>

            {isEditingTargets && (
              <div className={styles.settingsPanel}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Operational Variables</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>These values generate the targets in the global dataset grid.</p>
                
                <div className={styles.settingsGrid}>
                  <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>Total Active Clients</label>
                    <input 
                      type="number" 
                      className={styles.settingInput} 
                      value={configDraft['active_clients_count'] || ''}
                      onChange={(e) => setConfigDraft({...configDraft, active_clients_count: Number(e.target.value)})}
                    />
                    <span className={styles.helpText}>Drives Referral/Re-order targets</span>
                  </div>
                  <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>Meta Daily Base</label>
                    <input 
                      type="number" 
                      className={styles.settingInput} 
                      value={configDraft['target_meta_daily'] || ''}
                      onChange={(e) => setConfigDraft({...configDraft, target_meta_daily: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>Web Target (Sundays)</label>
                    <input 
                      type="number" 
                      className={styles.settingInput} 
                      value={configDraft['target_website_weekly'] || ''}
                      onChange={(e) => setConfigDraft({...configDraft, target_website_weekly: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>Referral Multipier (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className={styles.settingInput} 
                      value={configDraft['target_referral_pct'] || ''}
                      onChange={(e) => setConfigDraft({...configDraft, target_referral_pct: Number(e.target.value)})}
                    />
                  </div>
                  <div className={styles.settingItem}>
                    <label className={styles.settingLabel}>Re-Order Multipier (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className={styles.settingInput} 
                      value={configDraft['target_reorder_pct'] || ''}
                      onChange={(e) => setConfigDraft({...configDraft, target_reorder_pct: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className={styles.settingsActions}>
                  <button className="btn btn-primary" onClick={handleSaveConfig}>Save to Database</button>
                  <button className="btn btn-secondary" onClick={() => { setIsEditingTargets(false); setConfigDraft(config) }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Matrix Sheet */}
            <div className={styles.spreadsheetWrap}>
              <div className={styles.tableScroll}>
                <table className={styles.spreadsheetTable}>
                  <thead>
                    <tr>
                      <th colSpan={2} style={{ minWidth: 200, textAlign: 'left', paddingLeft: 16 }}>DASHBOARD TARGETS : MASTER</th>
                      {dates.map((d, i) => (
                        <th key={i}>{fmtDate(d)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* META */}
                    <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>META (ADV)</th></tr>
                    <tr className={styles.targetRow}>
                      <td className={styles.rowLabel}># Leads</td>
                      <td className={styles.targetCell}>Target</td>
                      {dates.map((d, i) => {
                        // Skip Sundays for Meta Targets (matching user spreadsheet)
                        const showTarget = d.getDay() !== 0
                        return (
                          <td key={i}>{showTarget ? metaDaily : <span className={styles.empty}>—</span>}</td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}># Leads</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                      {dates.map((d, i) => {
                        const defaultN = leads.filter(l => isMetaSource(l.source) && isSameDay(new Date(l.created_at), d)).length
                        const override = leadsManualActuals.find(x => x.day === fmtISO(d) && x.metric_type === 'all')?.value
                        const n = override !== undefined && override !== null ? override : defaultN
                        const isSunday = d.getDay() === 0
                        const isDeficit = n < metaDaily && !isSunday
                        return (
                          <td key={i} className={`${isToday(d) ? styles.todayCol : ''} ${isDeficit && n > 0 ? styles.deficit : ''} ${n >= metaDaily && !isSunday ? styles.surplus : ''}`}>
                             <input 
                                className={styles.inlineInput} 
                                type="number" 
                                placeholder={defaultN.toString()} 
                                value={override !== undefined && override !== null ? override : ''}
                                onChange={(e) => handleLeadsManualActualChange(fmtISO(d), 'all', e.target.value)}
                                ref={registerCell('all', i)}
                                onKeyDown={(e) => handleCellKeyDown(e, 'all', i)}
                             />
                          </td>
                        )
                      })}
                    </tr>

                    {/* WEBSITE */}
                    <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>WEBSITE</th></tr>
                    <tr className={styles.targetRow}>
                      <td className={styles.rowLabel}># Leads</td>
                      <td className={styles.targetCell}>Target</td>
                      {dates.map((d, i) => {
                        // Only target on Sundays (matching user spreadsheet)
                        const showTarget = d.getDay() === 0
                        return (
                          <td key={i}>{showTarget ? websiteWeekly : <span className={styles.empty}>—</span>}</td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}># Leads</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                      {dates.map((d, i) => {
                        const defaultN = leads.filter(l => isWebsiteSource(l.source) && isSameDay(new Date(l.created_at), d)).length
                        const override = leadsManualActuals.find(x => x.day === fmtISO(d) && x.metric_type === 'website')?.value
                        const n = override !== undefined && override !== null ? override : defaultN
                        return (
                          <td key={i} className={isToday(d) ? styles.todayCol : ''}>
                             <input 
                                className={styles.inlineInput} 
                                type="number" 
                                placeholder={defaultN.toString()} 
                                value={override !== undefined && override !== null ? override : ''}
                                onChange={(e) => handleLeadsManualActualChange(fmtISO(d), 'website', e.target.value)}
                                ref={registerCell('website', i)}
                                onKeyDown={(e) => handleCellKeyDown(e, 'website', i)}
                             />
                          </td>
                        )
                      })}
                    </tr>

                    {/* REFERRAL */}
                    <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>REFERRAL</th></tr>
                    <tr className={styles.targetRow}>
                      <td className={styles.rowLabel}># Leads</td>
                      <td className={styles.targetCell}>Target</td>
                      <td colSpan={dates.length} style={{ textAlign: 'left', paddingLeft: 16 }}>
                        Current active clients calculation (multiply this by {Math.round(refPct*100)}%): <strong>{projectedReferral} / month</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}># Leads</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                      {dates.map((d, i) => {
                        const defaultN = leads.filter(l => l.source?.toLowerCase().includes('referral') && isSameDay(new Date(l.created_at), d)).length
                        const override = leadsManualActuals.find(x => x.day === fmtISO(d) && x.metric_type === 'referral')?.value
                        const n = override !== undefined && override !== null ? override : defaultN
                        return (
                          <td key={i} className={isToday(d) ? styles.todayCol : ''}>
                             <input 
                                className={styles.inlineInput} 
                                type="number" 
                                placeholder={defaultN.toString()} 
                                value={override !== undefined && override !== null ? override : ''}
                                onChange={(e) => handleLeadsManualActualChange(fmtISO(d), 'referral', e.target.value)}
                                ref={registerCell('referral', i)}
                                onKeyDown={(e) => handleCellKeyDown(e, 'referral', i)}
                             />
                          </td>
                        )
                      })}
                    </tr>

                    {/* RE-ORDERS */}
                    <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>RE-ORDERS</th></tr>
                    <tr className={styles.targetRow}>
                      <td className={styles.rowLabel}># Orders</td>
                      <td className={styles.targetCell}>Target</td>
                      <td colSpan={dates.length} style={{ textAlign: 'left', paddingLeft: 16 }}>
                        Current active clients calculation (multiply this by {Math.round(reorderPct*100)}%): <strong>{projectedReorder} / month</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}># Orders</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                      {dates.map((d, i) => {
                        const defaultN = leads.filter(l => l.service_type?.toLowerCase().includes('re-order') && isSameDay(new Date(l.created_at), d)).length
                        const override = leadsManualActuals.find(x => x.day === fmtISO(d) && x.metric_type === 'reorder')?.value
                        const n = override !== undefined && override !== null ? override : defaultN
                        return (
                          <td key={i} className={isToday(d) ? styles.todayCol : ''}>
                             <input 
                                className={styles.inlineInput} 
                                type="number" 
                                placeholder={defaultN.toString()} 
                                value={override !== undefined && override !== null ? override : ''}
                                onChange={(e) => handleLeadsManualActualChange(fmtISO(d), 'reorder', e.target.value)}
                                ref={registerCell('reorder', i)}
                                onKeyDown={(e) => handleCellKeyDown(e, 'reorder', i)}
                             />
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'screening' && (
          <div className="fade-in">
             <div className={styles.sectionTitle}>
              Screening Aggregate Analytics
            </div>
            
            <div className={styles.chartContainer}>
              <div style={{ width: '100%', height: 360 }}>
                <ResponsiveContainer>
                  <AreaChart data={dates.map(d => ({
                      date: fmtDate(d),
                      Submitted: screeningStats.filter(s => s.day === fmtISO(d)).reduce((a, s) => a + s.submitted_count, 0),
                      Passed: screeningStats.filter(s => s.day === fmtISO(d)).reduce((a, s) => a + s.passed_count, 0)
                    }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSubmit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Submitted" stroke="var(--accent)" fillOpacity={1} fill="url(#colorSubmit)" />
                    <Area type="monotone" dataKey="Passed" stroke="var(--success)" fillOpacity={1} fill="url(#colorPass)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.sectionTitle} style={{ marginTop: 40, marginBottom: 16 }}>
              Screening Assessments Matrix
            </div>

            {testTitles.map((title) => {
              const isExpanded = expandedTests[title]
              const tTarget = screeningTargets.find(t => t.test_title === title) || { 
                test_title: title, target_completed: 0, target_passed: 0, target_l1: 0, target_hires: 0, target_days: [1,2,3,4,5] 
              }
              const isEditing = editingTestTarget === title
              
              return (
                <div key={title} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)' }}>
                  <div 
                    style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--bg-secondary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
                    onClick={() => handleToggleTest(title)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h4>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: 12 }} 
                      onClick={(e) => { e.stopPropagation(); setTestTargetDraft(tTarget); setEditingTestTarget(title); if (!isExpanded) handleToggleTest(title); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                      Targets
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: 16 }}>
                      {isEditing && testTargetDraft && (
                        <div className={styles.settingsPanel} style={{ marginBottom: 24 }}>
                           <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Configure {title} Targets</h4>
                           <div className={styles.settingsGrid}>
                             <div className={styles.settingItem}>
                               <label className={styles.settingLabel}>Completed Target / Day</label>
                               <input type="number" className={styles.settingInput} value={testTargetDraft.target_completed} onChange={e => setTestTargetDraft({...testTargetDraft, target_completed: Number(e.target.value)})} />
                             </div>
                             <div className={styles.settingItem}>
                               <label className={styles.settingLabel}>Passed Target / Day</label>
                               <input type="number" className={styles.settingInput} value={testTargetDraft.target_passed} onChange={e => setTestTargetDraft({...testTargetDraft, target_passed: Number(e.target.value)})} />
                             </div>
                             <div className={styles.settingItem}>
                               <label className={styles.settingLabel}>L1 Target / Day</label>
                               <input type="number" className={styles.settingInput} value={testTargetDraft.target_l1} onChange={e => setTestTargetDraft({...testTargetDraft, target_l1: Number(e.target.value)})} />
                             </div>
                             <div className={styles.settingItem}>
                               <label className={styles.settingLabel}>Hires Target / Day</label>
                               <input type="number" className={styles.settingInput} value={testTargetDraft.target_hires} onChange={e => setTestTargetDraft({...testTargetDraft, target_hires: Number(e.target.value)})} />
                             </div>
                           </div>
                           <div className={styles.settingsActions} style={{ marginTop: 16 }}>
                              <button className="btn btn-primary" onClick={handleSaveTestTarget}>Save Target Settings</button>
                              <button className="btn btn-secondary" onClick={() => setEditingTestTarget(null)}>Cancel</button>
                           </div>
                        </div>
                      )}

                      <div className={styles.tableWrap} style={{ margin: 0 }}>
                        <div className={styles.tableScroll}>
                           <table className={styles.spreadsheetTable}>
                             <thead>
                                <tr>
                                  <th colSpan={2} style={{ minWidth: 200, textAlign: 'left', paddingLeft: 16, background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>DASHBOARD TARGETS : MASTER</th>
                                  {dates.map((d, i) => (
                                    <th key={i}>{fmtDate(d)}</th>
                                  ))}
                                </tr>
                             </thead>
                             <tbody>
                               {/* COMPLETED SCREENINGS */}
                               <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>COMPLETED SCREENINGS</th></tr>
                               <tr className={styles.targetRow}>
                                  <td className={styles.rowLabel}>Completed</td>
                                  <td className={styles.targetCell}>Target</td>
                                  {dates.map((d, i) => (
                                    <td key={i}>{tTarget.target_days.includes(d.getDay()) && tTarget.target_completed > 0 ? tTarget.target_completed : <span className={styles.empty}>—</span>}</td>
                                  ))}
                               </tr>
                               <tr>
                                  <td className={styles.rowLabel}>Completed</td>
                                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                                  {dates.map((d, i) => {
                                     const actual = screeningStats.find(s => s.test_title === title && s.day === fmtISO(d))?.submitted_count || 0
                                     const hasTarget = tTarget.target_days.includes(d.getDay()) && tTarget.target_completed > 0
                                     const isDeficit = hasTarget && actual < tTarget.target_completed
                                     return (
                                        <td key={i} className={`${isToday(d) ? styles.todayCol : ''} ${isDeficit && actual > 0 ? styles.deficit : ''} ${hasTarget && actual >= tTarget.target_completed ? styles.surplus : ''}`}>
                                           {actual > 0 ? actual : <span className={styles.empty}>0</span>}
                                        </td>
                                     )
                                  })}
                               </tr>

                               {/* PASSED */}
                               <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>PASSED SCREENINGS</th></tr>
                               <tr className={styles.targetRow}>
                                  <td className={styles.rowLabel}>Passed</td>
                                  <td className={styles.targetCell}>Target</td>
                                  {dates.map((d, i) => (
                                    <td key={i}>{tTarget.target_days.includes(d.getDay()) && tTarget.target_passed > 0 ? tTarget.target_passed : <span className={styles.empty}>—</span>}</td>
                                  ))}
                               </tr>
                               <tr>
                                  <td className={styles.rowLabel}>Passed</td>
                                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                                  {dates.map((d, i) => {
                                     const actual = screeningStats.find(s => s.test_title === title && s.day === fmtISO(d))?.passed_count || 0
                                     const hasTarget = tTarget.target_days.includes(d.getDay()) && tTarget.target_passed > 0
                                     const isDeficit = hasTarget && actual < tTarget.target_passed
                                     return (
                                        <td key={i} className={`${isToday(d) ? styles.todayCol : ''} ${isDeficit && actual > 0 ? styles.deficit : ''} ${hasTarget && actual >= tTarget.target_passed ? styles.surplus : ''}`}>
                                           {actual > 0 ? actual : <span className={styles.empty}>0</span>}
                                        </td>
                                     )
                                  })}
                               </tr>

                               {/* FAILED */}
                               <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>FAILED SCREENINGS</th></tr>
                               <tr className={styles.targetRow}>
                                  <td className={styles.rowLabel}>Failed</td>
                                  <td className={styles.targetCell}>Target</td>
                                  {dates.map((d, i) => (
                                    <td key={i}><span className={styles.empty}>—</span></td>
                                  ))}
                               </tr>
                               <tr>
                                  <td className={styles.rowLabel}>Failed</td>
                                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                                  {dates.map((d, i) => {
                                     const actual = screeningStats.find(s => s.test_title === title && s.day === fmtISO(d))?.failed_count || 0
                                     // Fails have no target, we just display actual. We color them danger if they are high, maybe, but sticking to neutral layout for now
                                     return (
                                        <td key={i} className={`${isToday(d) ? styles.todayCol : ''} ${actual > 0 ? styles.deficit : ''}`}>
                                           {actual > 0 ? actual : <span className={styles.empty}>0</span>}
                                        </td>
                                     )
                                  })}
                               </tr>

                               {/* L1 INTERVIEWS */}
                               <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>L1 INTERVIEWS (Manual Entry)</th></tr>
                               <tr className={styles.targetRow}>
                                  <td className={styles.rowLabel}>Interviewed</td>
                                  <td className={styles.targetCell}>Target</td>
                                  {dates.map((d, i) => (
                                    <td key={i}>{tTarget.target_days.includes(d.getDay()) && tTarget.target_l1 > 0 ? tTarget.target_l1 : <span className={styles.empty}>—</span>}</td>
                                  ))}
                               </tr>
                               <tr>
                                  <td className={styles.rowLabel}>Interviewed</td>
                                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                                  {dates.map((d, i) => {
                                     const dayISO = fmtISO(d)
                                     const rec = screeningManualActuals.find(a => a.test_title === title && a.day === dayISO)
                                     const actual = rec?.l1_actual || 0
                                     const hasTarget = tTarget.target_days.includes(d.getDay()) && tTarget.target_l1 > 0
                                     const isDeficit = hasTarget && actual < tTarget.target_l1
                                     return (
                                        <td key={i} className={`${isToday(d) ? styles.todayCol : ''} ${isDeficit && actual > 0 ? styles.deficit : ''} ${hasTarget && actual >= tTarget.target_l1 ? styles.surplus : ''}`} style={{ padding: 4, minWidth: 60 }}>
                                           <input 
                                              type="number" 
                                              className={styles.settingInput} 
                                              style={{ width: '100%', height: 32, padding: 4, textAlign: 'center', background: 'transparent', border: '1px solid transparent', boxShadow: 'none' }} 
                                              defaultValue={actual || ''} 
                                              placeholder="—"
                                              onBlur={(e) => handleManualActualUpdate(title, dayISO, 'l1_actual', e.target.value)}
                                           />
                                        </td>
                                     )
                                  })}
                               </tr>

                               {/* HIRES */}
                               <tr><th colSpan={dates.length + 2} className={styles.rowGroup}>HIRES (Manual Entry)</th></tr>
                               <tr className={styles.targetRow}>
                                  <td className={styles.rowLabel}>Hires</td>
                                  <td className={styles.targetCell}>Target</td>
                                  {dates.map((d, i) => (
                                    <td key={i}>{tTarget.target_days.includes(d.getDay()) && tTarget.target_hires > 0 ? tTarget.target_hires : <span className={styles.empty}>—</span>}</td>
                                  ))}
                               </tr>
                               <tr>
                                  <td className={styles.rowLabel}>Hires</td>
                                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actual</td>
                                  {dates.map((d, i) => {
                                     const dayISO = fmtISO(d)
                                     const rec = screeningManualActuals.find(a => a.test_title === title && a.day === dayISO)
                                     const actual = rec?.hires_actual || 0
                                     const hasTarget = tTarget.target_days.includes(d.getDay()) && tTarget.target_hires > 0
                                     const isDeficit = hasTarget && actual < tTarget.target_hires
                                     return (
                                        <td key={i} className={`${isToday(d) ? styles.todayCol : ''} ${isDeficit && actual > 0 ? styles.deficit : ''} ${hasTarget && actual >= tTarget.target_hires ? styles.surplus : ''}`} style={{ padding: 4, minWidth: 60 }}>
                                           <input 
                                              type="number" 
                                              className={styles.settingInput} 
                                              style={{ width: '100%', height: 32, padding: 4, textAlign: 'center', background: 'transparent', border: '1px solid transparent', boxShadow: 'none' }} 
                                              defaultValue={actual || ''} 
                                              placeholder="—"
                                              onBlur={(e) => handleManualActualUpdate(title, dayISO, 'hires_actual', e.target.value)}
                                           />
                                        </td>
                                     )
                                  })}
                               </tr>

                             </tbody>
                           </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          </div>
        )}
      </div>
    </div>
  )
}
