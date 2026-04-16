'use client'

import React, { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { LeadWithOverdue } from '@/lib/types'
import styles from '../dashboard.module.css'

const STAGE_COLORS: Record<string, { bg: string, text: string }> = {
  'new-lead': { bg: 'var(--accent-glow)', text: 'var(--accent-dark)' },
  'order-review': { bg: 'var(--purple-bg)', text: 'var(--purple)' },
  'pending-approval': { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  'approved': { bg: 'var(--success-bg)', text: 'var(--success)' },
  'job-description': { bg: 'var(--info-bg)', text: 'var(--info)' },
  'confirmation-sent': { bg: 'var(--info-bg)', text: 'var(--info)' },
  'active-recruitment': { bg: 'rgba(132, 204, 22, 0.1)', text: '#65a30d' },
  'candidates-sourced': { bg: 'rgba(163, 230, 53, 0.2)', text: '#65a30d' },
  'candidates-submitted': { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  'rm-interview': { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  'josh-interview': { bg: 'var(--purple-bg)', text: 'var(--purple)' },
  'client-interview': { bg: 'var(--purple-bg)', text: 'var(--purple)' },
  'offer-placement': { bg: 'var(--success-bg)', text: 'var(--success)' },
  'closed': { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
}

const SOURCE_COLORS: Record<string, { bg: string, text: string }> = {
  'meta': { bg: 'rgba(24, 119, 242, 0.1)', text: '#1877F2' },
  'helm.ceo': { bg: 'var(--purple-bg)', text: 'var(--purple)' },
  'coordinators.pro': { bg: 'var(--info-bg)', text: 'var(--info)' },
  'default': { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const fullUrl = `${window.location.origin}${url}`
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={handleCopy}
      style={{ padding: '6px 12px', fontSize: 11, borderRadius: 'var(--radius-xl)' }}
    >
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}

export default function LeadsPipelinePage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadWithOverdue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const fetchLeads = () => {
    setLoading(true)
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data)
        else setError(data.error ?? 'Failed to load pipeline data')
      })
      .catch(() => setError('Network connection failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return

    try {
      const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setLeads(leads.filter(l => l.id !== id))
      } else {
        alert(data.error ?? 'Failed to delete lead')
      }
    } catch (err) {
      alert('Failed to delete lead due to a network error')
    }
  }

  const stages = Array.from(new Set(leads.map((l) => l.current_stage)))

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      l.contact_name?.toLowerCase().includes(q) ||
      l.contact_email?.toLowerCase().includes(q) ||
      l.executive?.toLowerCase().includes(q) ||
      l.service_type?.toLowerCase().includes(q)
    const matchStage = stageFilter === 'all' || l.current_stage === stageFilter
    const matchOverdue = !overdueOnly || l.is_overdue
    return matchSearch && matchStage && matchOverdue
  })

  const groupedLeads = filtered.reduce((acc, lead) => {
    const sourceKey = lead.source ? lead.source.toLowerCase() : 'unknown'
    if (!acc[sourceKey]) acc[sourceKey] = []
    acc[sourceKey].push(lead)
    return acc
  }, {} as Record<string, LeadWithOverdue[]>)

  const overdueCount = leads.filter((l) => l.is_overdue).length

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pipeline Overview</h1>
          <p className={styles.pageSubtitle}>
            {leads.length} Active Leads in Queue
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Leads</div>
            <div className={styles.kpiValue}>{leads.length}</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel} style={{ color: 'var(--danger)' }}>Action Required</div>
            <div className={styles.kpiValue} style={{ color: overdueCount > 0 ? 'var(--danger)' : '' }}>{overdueCount}</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel} style={{ color: 'var(--success)' }}>Total Pipeline Value</div>
            <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>
              {formatCurrency(leads.reduce((s, l) => s + (l.deal_value ?? 0), 0))}
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            className="input searchInput"
            placeholder="Search by name, email, or executive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input filterSelect"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All Pipeline Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <button
            className={`btn ${overdueOnly ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setOverdueOnly(!overdueOnly)}
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            {overdueOnly ? 'Clear Overdue Filter' : 'Show Overdue Only'}
          </button>
        </div>

        {loading && (
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Loading pipeline data...</span>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', padding: 24, background: 'var(--danger-bg)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Attention Required</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No leads match your current search constraints.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.metricsTable} style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Client Contact</th>
                  <th>Source</th>
                  <th>Current Stage</th>
                  <th>Deal Value</th>
                  <th>Executive</th>
                  <th>SLA Deadline</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedLeads).map(([sourceKey, sourceLeads]) => (
                  <Fragment key={sourceKey}>
                    <tr style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={8} style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>
                        Source: {
                          sourceKey === 'meta' ? (
                            <span className="badge" style={{ background: SOURCE_COLORS['meta'].bg, color: SOURCE_COLORS['meta'].text, marginLeft: 8 }}>Meta</span>
                          ) : sourceKey === 'unknown' ? (
                            <span className="badge" style={{ background: SOURCE_COLORS['default'].bg, color: SOURCE_COLORS['default'].text, marginLeft: 8 }}>Unspecified</span>
                          ) : (
                            <span className="badge" style={{ background: (SOURCE_COLORS[sourceKey] || SOURCE_COLORS['default']).bg, color: (SOURCE_COLORS[sourceKey] || SOURCE_COLORS['default']).text, marginLeft: 8 }}>{sourceKey}</span>
                          )
                        } <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-muted)' }}>({sourceLeads.length} leads)</span>
                      </td>
                    </tr>
                    {sourceLeads.map((lead) => {
                      const dangerState = lead.is_overdue
                      const styleData = STAGE_COLORS[lead.current_stage] ?? STAGE_COLORS['closed']
                      
                      return (
                    <tr 
                      key={lead.id} 
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: dangerState ? 'var(--danger-bg)' : 'transparent' 
                      }}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = dangerState ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-secondary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = dangerState ? 'var(--danger-bg)' : 'transparent'
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {lead.contact_name ?? 'Unnamed Lead'}
                            {dangerState && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} title="Overdue" />}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lead.contact_email ?? 'No email provided'}</div>
                        </div>
                      </td>
                      <td>
                        {lead.source ? (
                          <span
                            className="badge"
                            style={{
                              background: (SOURCE_COLORS[lead.source.toLowerCase()] || SOURCE_COLORS['default']).bg,
                              color: (SOURCE_COLORS[lead.source.toLowerCase()] || SOURCE_COLORS['default']).text,
                              textTransform: lead.source.toLowerCase() === 'meta' ? 'capitalize' : 'none'
                            }}
                          >
                            {lead.source.toLowerCase() === 'meta' ? 'Meta' : lead.source}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: styleData.bg,
                            color: styleData.text
                          }}
                        >
                          {lead.stage_label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {lead.deal_value ? formatCurrency(lead.deal_value) : '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{lead.executive ?? lead.assigned_to ?? '—'}</td>
                      <td>
                        {lead.due_date ? (
                          <span style={{ color: dangerState ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
                            {formatDate(lead.due_date.due_at)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDate(lead.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {lead.context_url ? (
                            <CopyUrlButton url={lead.context_url} />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                          <button
                            className="btn btn-secondary"
                            onClick={(e) => handleDelete(e, lead.id)}
                            title="Delete Lead"
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: 11, 
                              borderRadius: 'var(--radius-xl)', 
                              color: 'var(--danger)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
