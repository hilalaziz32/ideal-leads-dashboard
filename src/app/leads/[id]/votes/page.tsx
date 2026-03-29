'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PipelineVote, PipelineStageConfig } from '@/lib/types'
import styles from './votes.module.css'

interface VoteTally {
  approve: number
  reject: number
  voters: PipelineVote[]
}

export default function VotesPage() {
  const { id } = useParams<{ id: string }>()
  const [votes, setVotes] = useState<PipelineVote[]>([])
  const [tally, setTally] = useState<Record<string, VoteTally>>({})
  const [stageConfig, setStageConfig] = useState<PipelineStageConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/leads/${id}/votes`).then((r) => r.json()),
      fetch(`/api/leads/${id}`).then((r) => r.json()),
    ])
      .then(([voteData, leadData]) => {
        if (voteData.error) setError(voteData.error)
        else {
          setVotes(voteData.votes)
          setTally(voteData.tally)
        }
        setStageConfig(leadData.stage_config ?? [])
      })
      .catch(() => setError('Failed to load votes'))
      .finally(() => setLoading(false))
  }, [id])

  const stageMap = new Map(stageConfig.map((s) => [s.stage, s.label]))
  const stagesWithVotes = Object.keys(tally)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={styles.inner}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vote Results</h1>
        <p className={styles.subtitle}>Read-only view of committee votes for this lead.</p>
      </div>

      {loading && <div className="loading-spinner"><div className="spinner" /></div>}
      {error && <div className="error-state"><h3>Error</h3><p>{error}</p></div>}

      {!loading && stagesWithVotes.length === 0 && (
        <div className="empty-state">
          <h3>No votes yet</h3>
          <p>Votes will appear here once committee members vote on this lead.</p>
        </div>
      )}

      {!loading && stagesWithVotes.length > 0 && (
        <div className={styles.stagesList}>
          {stagesWithVotes.map((stage) => {
            const t = tally[stage]
            const total = t.approve + t.reject
            const approvePercent = total > 0 ? (t.approve / total) * 100 : 0

            return (
              <div key={stage} className={styles.stageBlock}>
                <div className={styles.stageHeader}>
                  <h2 className={styles.stageName}>{stageMap.get(stage) ?? stage}</h2>
                  <div className={styles.tallyChips}>
                    <span className="badge badge-success">✓ {t.approve} Approve</span>
                    <span className="badge badge-danger">✗ {t.reject} Reject</span>
                  </div>
                </div>

                <div className={styles.meter}>
                  <div className={styles.meterFill} style={{ width: `${approvePercent}%` }} />
                </div>
                <div className={styles.meterLabels}>
                  <span style={{ color: 'var(--success)' }}>{approvePercent.toFixed(0)}% approve</span>
                  <span style={{ color: 'var(--text-muted)' }}>{total} votes total</span>
                </div>

                <div className={styles.voterList}>
                  {t.voters.map((v) => (
                    <div key={v.id} className={styles.voterRow}>
                      <div className={styles.voterAvatar}>
                        {(v.voter_name ?? v.voter_slack_id)[0].toUpperCase()}
                      </div>
                      <div className={styles.voterInfo}>
                        <span className={styles.voterName}>{v.voter_name ?? v.voter_slack_id}</span>
                        {v.reason && <span className={styles.voteReason}>&ldquo;{v.reason}&rdquo;</span>}
                      </div>
                      <span className={`badge ${v.vote === 'approve' ? 'badge-success' : 'badge-danger'}`}>
                        {v.vote === 'approve' ? '✓ Approve' : '✗ Reject'}
                      </span>
                      <span className={styles.voteDate}>{formatDate(v.voted_at ?? '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All votes raw list */}
      {!loading && votes.length > 0 && (
        <div className={styles.allVotes}>
          <h3 className={styles.allVotesTitle}>All Votes ({votes.length})</h3>
          {votes.map((v) => (
            <div key={v.id} className={styles.voteRow}>
              <span className={`badge ${v.vote === 'approve' ? 'badge-success' : 'badge-danger'}`}>
                {v.vote}
              </span>
              <span className={styles.voterName}>{v.voter_name ?? v.voter_slack_id}</span>
              <span className={styles.voteStage}>— {stageMap.get(v.stage) ?? v.stage}</span>
              <span className={styles.voteDate}>{formatDate(v.voted_at ?? '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
