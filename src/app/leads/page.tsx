'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LeadWithOverdue } from '@/lib/types'
import styles from '../dashboard.module.css'

const STAGE_COLORS: Record<string, string> = {
  'new-lead': '#6366f1',
  'order-review': '#8b5cf6',
  'pending-approval': '#f59e0b',
  'approved': '#10b981',
  'job-description': '#3b82f6',
  'confirmation-sent': '#06b6d4',
  'active-recruitment': '#84cc16',
  'candidates-sourced': '#a3e635',
  'candidates-submitted': '#f97316',
  'rm-interview': '#fb923c',
  'josh-interview': '#e879f9',
  'client-interview': '#c084fc',
  'offer-placement': '#34d399',
  'closed': '#6b7280',
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
      className={styles.copyBtn}
      onClick={handleCopy}
      title="Copy client link"
    >
      {copied ? (
        <><span className={styles.copyIcon}>✓</span> Copied</>
      ) : (
        <><span className={styles.copyIcon}>⎘</span> Copy link</>
      )}
    </button>
  )
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<LeadWithOverdue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data)
        else setError(data.error ?? 'Failed to load leads')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [])

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

  const overdueCount = leads.filter((l) => l.is_overdue).length

  return (
    <div className={styles.page}>
      <div className="page-container">
        <div className={styles.header}>
          <div>
            <h1 className="page-title">Leads Pipeline</h1>
            <p className="page-subtitle">{leads.length} total leads · {overdueCount} overdue</p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{leads.length}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue} style={{ color: 'var(--danger)' }}>{overdueCount}</span>
              <span className={styles.statLabel}>Overdue</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(leads.reduce((s, l) => s + (l.deal_value ?? 0), 0))}
              </span>
              <span className={styles.statLabel}>Pipeline Value</span>
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            className={`input ${styles.searchInput}`}
            placeholder="Search by name, email, exec…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={`input ${styles.filterSelect}`}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>
            ))}
          </select>
          <button
            className={`btn ${overdueOnly ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setOverdueOnly(!overdueOnly)}
          >
            <span className={overdueOnly ? 'overdue-dot' : ''} />
            Overdue Only
          </button>
        </div>

        {loading && (
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Loading leads…</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <h3>No leads found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Stage</th>
                  <th>Deal Value</th>
                  <th>Executive</th>
                  <th>Due Date</th>
                  <th>Created</th>
                  <th>Client URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className={lead.is_overdue ? styles.rowOverdue : ''}>
                    <td>
                      <div className={styles.contactCell}>
                        <div className={styles.avatar}>
                          {(lead.contact_name ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.contactName}>
                            {lead.contact_name ?? '—'}
                            {lead.is_overdue && <span className="overdue-dot" style={{ marginLeft: 8 }} />}
                          </div>
                          <div className={styles.contactEmail}>{lead.contact_email ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${STAGE_COLORS[lead.current_stage] ?? '#6366f1'}1a`,
                          color: STAGE_COLORS[lead.current_stage] ?? '#6366f1',
                          border: `1px solid ${STAGE_COLORS[lead.current_stage] ?? '#6366f1'}40`,
                        }}
                      >
                        {lead.stage_label}
                      </span>
                    </td>
                    <td className={styles.dealValue}>
                      {lead.deal_value ? formatCurrency(lead.deal_value) : '—'}
                    </td>
                    <td className={styles.muted}>{lead.executive ?? lead.assigned_to ?? '—'}</td>
                    <td>
                      {lead.due_date ? (
                        <span className={lead.is_overdue ? styles.overdueDateText : styles.dueDateText}>
                          {formatDate(lead.due_date.due_at)}
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.muted}>{formatDate(lead.created_at)}</td>
                    <td>
                      {lead.context_url ? (
                        <CopyUrlButton url={lead.context_url} />
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/leads/${lead.id}`} className="btn btn-secondary" style={{ fontSize: 13, padding: '7px 14px' }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
