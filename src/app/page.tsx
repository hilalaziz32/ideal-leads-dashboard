'use client'

import { useEffect, useState } from 'react'
import { LeadWithOverdue } from '@/lib/types'
import styles from './dashboard.module.css'

function isWebsiteSource(source: string | null) {
  if (!source) return false
  source = source.toLowerCase()
  // simple heuristic for "domain": contains a dot and doesn't have spaces
  return source.includes('.') && !source.includes(' ')
}

function isMetaSource(source: string | null) {
  if (!source) return false
  source = source.toLowerCase()
  return source.includes('facebook') || source.includes('instagram') || source.includes('meta')
}

// Generate the last 14 days
function generateDates() {
  const dates = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d)
  }
  return dates
}

function formatDateHeader(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export default function MetricsDashboard() {
  const [leads, setLeads] = useState<LeadWithOverdue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const dates = generateDates()

  // Targets (these would ideally come from a DB or settings, hardcoding as per screenshot feeling)
  const T_META_LEADS: number = 20
  const T_WEBSITE_SESSIONS: number = 1
  const T_REFERRAL_LEADS: number = 0
  const T_REORDERS: number = 0

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner" style={{ marginTop: '10vh' }}>
          <div className="spinner" />
          <span>Loading metrics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className="page-container" style={{ maxWidth: '100%', padding: '32px' }}>
        <h1 className="page-title" style={{ marginBottom: 32 }}>DASHBOARD 1 - NEW ORDERS</h1>
        
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <table className={styles.metricsTable} style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '200px', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}></th>
                {dates.map((d, i) => (
                  <th key={i} style={{ textAlign: 'center', padding: '12px 8px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {formatDateHeader(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* META */}
              <tr style={{ background: 'var(--bg-card)' }}>
                <td colSpan={dates.length + 1} style={{ padding: '8px 16px', fontWeight: 'bold', fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                  META
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Leads <span style={{ float: 'right', color: 'var(--danger)' }}>Target</span></td>
                {dates.map((d, i) => <td key={i} style={{ textAlign: 'center', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{T_META_LEADS}</td>)}
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Leads <span style={{ float: 'right', color: 'var(--text-muted)' }}>Actual</span></td>
                {dates.map((d, i) => {
                  const actual = leads.filter(l => isMetaSource(l.source) && isSameDay(new Date(l.created_at), d)).length
                  return <td key={i} style={{ textAlign: 'center', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{actual || '—'}</td>
                })}
              </tr>

              {/* WEBSITE */}
              <tr style={{ background: 'var(--bg-card)' }}>
                <td colSpan={dates.length + 1} style={{ padding: '8px 16px', fontWeight: 'bold', fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                  WEBSITE
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Leads <span style={{ float: 'right', color: 'var(--danger)' }}>Target</span></td>
                {dates.map((d, i) => <td key={i} style={{ textAlign: 'center', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{T_WEBSITE_SESSIONS === 0 ? '—' : T_WEBSITE_SESSIONS}</td>)}
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Leads <span style={{ float: 'right', color: 'var(--text-muted)' }}>Actual</span></td>
                {dates.map((d, i) => {
                  const actual = leads.filter(l => isWebsiteSource(l.source) && isSameDay(new Date(l.created_at), d)).length
                  return <td key={i} style={{ textAlign: 'center', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{actual || '—'}</td>
                })}
              </tr>

              {/* REFERRAL */}
              <tr style={{ background: 'var(--bg-card)' }}>
                <td colSpan={dates.length + 1} style={{ padding: '8px 16px', fontWeight: 'bold', fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                  REFERRAL
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Leads <span style={{ float: 'right', color: 'var(--danger)' }}>Target</span></td>
                <td colSpan={dates.length} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Referral targets dynamically calculated in spreadsheet</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Leads <span style={{ float: 'right', color: 'var(--text-muted)' }}>Actual</span></td>
                {dates.map((d, i) => {
                  const actual = leads.filter(l => l.source?.toLowerCase().includes('referral') && isSameDay(new Date(l.created_at), d)).length
                  return <td key={i} style={{ textAlign: 'center', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{actual || '—'}</td>
                })}
              </tr>

              {/* RE-ORDERS */}
              <tr style={{ background: 'var(--bg-card)' }}>
                <td colSpan={dates.length + 1} style={{ padding: '8px 16px', fontWeight: 'bold', fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                  RE-ORDERS
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Orders <span style={{ float: 'right', color: 'var(--danger)' }}>Target</span></td>
                <td colSpan={dates.length} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Re-order targets dynamically calculated</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border)' }}># Orders <span style={{ float: 'right', color: 'var(--text-muted)' }}>Actual</span></td>
                {dates.map((d, i) => {
                  const actual = leads.filter(l => l.service_type?.toLowerCase().includes('re-order') && isSameDay(new Date(l.created_at), d)).length
                  return <td key={i} style={{ textAlign: 'center', fontSize: 13, borderBottom: '1px solid var(--border)' }}>{actual || '—'}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
