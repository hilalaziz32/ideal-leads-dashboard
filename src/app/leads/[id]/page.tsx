'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  OrderLead,
  PipelineStage,
  PipelineStageDueDate,
  PipelineStageConfig,
  QuestionAnswer,
} from '@/lib/types'
import styles from './lead.module.css'

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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

interface LeadDetailData {
  lead: OrderLead
  stages: PipelineStage[]
  due_dates: PipelineStageDueDate[]
  stage_config: PipelineStageConfig[]
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<LeadDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qualifying, setQualifying] = useState(false)
  const [qualified, setQualified] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [referralPartners, setReferralPartners] = useState<any[]>([])
  const [savingReferral, setSavingReferral] = useState(false)

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))

    fetch('/api/referrals')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setReferralPartners(d)
      })
      .catch(console.error)
  }, [id])

  const handleReferralChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === 'none' ? null : e.target.value
    setSavingReferral(true)
    
    // optimistic update
    if (data) {
      setData({ ...data, lead: { ...data.lead, referral_id: val } })
    }

    try {
      await fetch(`/api/leads/${id}/referral`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_id: val })
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSavingReferral(false)
    }
  }

  const handleQualify = async () => {
    setQualifying(true)
    const res = await fetch(`/api/leads/${id}/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qualified_by: 'team' }),
    })
    const result = await res.json()
    if (result.success) {
      setQualified(true)
      // Refresh lead data
      fetch(`/api/leads/${id}`)
        .then((r) => r.json())
        .then((d) => { if (!d.error) setData(d) })
    }
    setQualifying(false)
  }

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${url}`)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading lead…</span></div>
  if (error) return <div className="error-state"><h3>Error</h3><p>{error}</p></div>
  if (!data) return null

  const { lead, stages, due_dates, stage_config } = data
  const stageMap = new Map(stage_config.map((s) => [s.stage, s]))
  const currentDue = due_dates.find((d) => d.stage === lead.current_stage)
  const isOverdue = currentDue ? new Date(currentDue.due_at) < new Date() : false
  const questions = (lead.questions ?? []) as QuestionAnswer[]

  const QUALIFIED_STAGES = ['approved', 'job-description', 'confirmation-sent', 'active-recruitment', 'candidates-sourced', 'candidates-submitted', 'rm-interview', 'josh-interview', 'client-interview', 'offer-placement', 'closed']
  const isAlreadyQualified = QUALIFIED_STAGES.includes(lead.current_stage)

  return (
    <div className={styles.page}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.bigAvatar}>
              {(lead.contact_name ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className={styles.leadName}>{lead.contact_name ?? 'Unknown'}</h1>
              <div className={styles.leadMeta}>
                {lead.contact_email && <span>{lead.contact_email}</span>}
                {lead.contact_phone && <span>·</span>}
                {lead.contact_phone && <span>{lead.contact_phone}</span>}
              </div>
              {lead.context_url && (
                <button
                  className={styles.shareLink}
                  onClick={() => handleCopyUrl(lead.context_url!)}
                  title="Copy shareable link"
                >
                  {urlCopied ? '✓ Link copied!' : `⎘ ${window?.location?.origin ?? 'https://yoursite.com'}${lead.context_url}`}
                </button>
              )}
              <div className={styles.leadBadges}>
                <span
                  className="badge"
                  style={{
                    background: `${STAGE_COLORS[lead.current_stage] ?? '#6366f1'}1a`,
                    color: STAGE_COLORS[lead.current_stage] ?? '#6366f1',
                    border: `1px solid ${STAGE_COLORS[lead.current_stage] ?? '#6366f1'}40`,
                  }}
                >
                  {stageMap.get(lead.current_stage)?.label ?? lead.current_stage}
                </span>
                {isOverdue && <span className="badge badge-danger">⚠ Overdue</span>}
                {lead.service_type && <span className="badge badge-info">{lead.service_type}</span>}
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Referred By:</span>
                <select 
                  style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}
                  disabled={savingReferral}
                  value={lead.referral_id || 'none'}
                  onChange={handleReferralChange}
                >
                  <option value="none">None (Direct / Website)</option>
                  {referralPartners.map(rp => (
                    <option key={rp.id} value={rp.id}>{rp.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(lead.deal_value ?? 0)}
              </span>
              <span className={styles.heroStatLabel}>Deal Value</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{lead.executive ?? lead.assigned_to ?? '—'}</span>
              <span className={styles.heroStatLabel}>Executive</span>
            </div>
            {currentDue && (
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue} style={{ color: isOverdue ? 'var(--danger)' : 'var(--warning)' }}>
                  {formatDate(currentDue.due_at)}
                </span>
                <span className={styles.heroStatLabel}>Stage Due Date</span>
              </div>
            )}
            {/* Qualify button */}
            <div className={styles.qualifyWrap}>
              {isAlreadyQualified || qualified ? (
                <div className={styles.qualifiedBadge}>
                  <span>✓</span> Qualified
                </div>
              ) : (
                <button
                  className={`btn btn-primary ${styles.qualifyBtn}`}
                  onClick={handleQualify}
                  disabled={qualifying}
                >
                  {qualifying ? 'Qualifying…' : '⚡ Qualify Lead'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Info card */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Lead / Order Details</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Name</span><span>{lead.contact_name ?? '—'}</span></div>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Email</span><span style={{ wordBreak: 'break-all' }}>{lead.contact_email ? <a href={`mailto:${lead.contact_email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{lead.contact_email}</a> : '—'}</span></div>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Phone</span><span>{lead.contact_phone ? <a href={`tel:${lead.contact_phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{lead.contact_phone}</a> : '—'}</span></div>
              
              <div className={styles.infoItem}><span className={styles.infoLabel}>Service</span><span>{lead.service_type ?? '—'}</span></div>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Deal Value</span><span>{lead.deal_value ? formatCurrency(lead.deal_value) : '—'}</span></div>
              
              <div className={styles.infoItem}><span className={styles.infoLabel}>Source</span><span>{lead.source ?? '—'}</span></div>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Assigned To</span><span>{lead.assigned_to ?? '—'}</span></div>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Executive</span><span>{lead.executive ?? '—'}</span></div>
              
              <div className={styles.infoItem}><span className={styles.infoLabel}>Created</span><span>{formatDate(lead.created_at)}</span></div>
              <div className={styles.infoItem}><span className={styles.infoLabel}>Updated</span><span>{formatDate(lead.updated_at)}</span></div>
            </div>
            {lead.message && (
              <div className={styles.textBlock}>
                <span className={styles.infoLabel}>Message</span>
                <p className={styles.textContent}>{lead.message}</p>
              </div>
            )}
            {lead.notes && (
              <div className={styles.textBlock}>
                <span className={styles.infoLabel}>Notes</span>
                <p className={styles.textContent}>{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="card">
            <h2 className={styles.sectionTitle}>Links & Resources</h2>
            <div className={styles.linkList}>
              {lead.meeting_url && (
                <a href={lead.meeting_url} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <span className={styles.linkIcon}>📅</span>
                  <span>Meeting Recording / URL</span>
                  <span className={styles.linkArrow}>→</span>
                </a>
              )}
              {lead.docs && (
                <a href={lead.docs} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  <span className={styles.linkIcon}>📄</span>
                  <span>Documents</span>
                  <span className={styles.linkArrow}>→</span>
                </a>
              )}
              {lead.slack_channel_josh && (
                <div className={styles.linkItem}>
                  <span className={styles.linkIcon}>💬</span>
                  <span>Josh Slack: <code className={styles.code}>{lead.slack_channel_josh}</code></span>
                </div>
              )}
              {lead.slack_channel_approval && (
                <div className={styles.linkItem}>
                  <span className={styles.linkIcon}>✅</span>
                  <span>Approval Slack: <code className={styles.code}>{lead.slack_channel_approval}</code></span>
                </div>
              )}
              {lead.slack_channel_lead && (
                <div className={styles.linkItem}>
                  <span className={styles.linkIcon}>👤</span>
                  <span>Lead Slack: <code className={styles.code}>{lead.slack_channel_lead}</code></span>
                </div>
              )}
              {!lead.meeting_url && !lead.docs && !lead.slack_channel_josh && !lead.slack_channel_approval && !lead.slack_channel_lead && (
                <p style={{ color: 'var(--text-muted)' }}>No links added yet.</p>
              )}
            </div>
          </div>

          {/* Stage Timeline */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h2 className={styles.sectionTitle}>Stage Timeline</h2>
            <div className={styles.timeline}>
              {stage_config.map((sc) => {
                const record = stages.find((s) => s.stage === sc.stage)
                const dueDate = due_dates.find((d) => d.stage === sc.stage)
                const isCurrent = sc.stage === lead.current_stage
                const isPast = record?.exited_at != null
                const isFuture = !record

                return (
                  <div
                    key={sc.stage}
                    className={`${styles.timelineItem} ${isCurrent ? styles.timelineCurrent : ''} ${isPast ? styles.timelinePast : ''} ${isFuture ? styles.timelineFuture : ''}`}
                  >
                    <div className={styles.timelineDot} style={{ background: isCurrent ? STAGE_COLORS[sc.stage] ?? 'var(--accent)' : undefined }} />
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineLabel}>{sc.label}</div>
                      {record && (
                        <div className={styles.timelineMeta}>
                          {formatDate(record.entered_at)}
                          {record.exited_at && ` → ${formatDate(record.exited_at)}`}
                          {record.moved_by && ` · by ${record.moved_by}`}
                        </div>
                      )}
                      {dueDate && (
                        <div className={styles.timelineMeta} style={{ color: new Date(dueDate.due_at) < new Date() ? 'var(--danger)' : 'var(--warning)' }}>
                          Due: {formatDate(dueDate.due_at)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Questions */}
          {questions.length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitle}>Intake Questions</h2>
                <Link href={`/leads/${id}/questions`} className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>Edit</Link>
              </div>
              <div className={styles.qnaList}>
                {questions.map((q, i) => (
                  <div key={i} className={styles.qnaItem}>
                    <div className={styles.qnaQuestion}>{q.question}</div>
                    <div className={styles.qnaAnswer}>{q.answer || <span style={{ color: 'var(--text-muted)' }}>No answer yet</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
    </div>
  )
}
