'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
// router kept for post-advance redirect
import { ChecklistItemState } from '@/lib/types'
import styles from './checklist.module.css'

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [stage, setStage] = useState<string>('')
  const [checklist, setChecklist] = useState<ChecklistItemState[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchChecklist = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/leads/${id}/checklist`)
    const data = await res.json()
    if (data.error) setError(data.error)
    else {
      setStage(data.stage)
      setChecklist(data.checklist)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchChecklist() }, [fetchChecklist])

  const toggleItem = async (key: string, currentDone: boolean) => {
    // Optimistic update
    setChecklist((prev) => prev.map((c) => c.key === key ? { ...c, done: !currentDone } : c))

    const res = await fetch(`/api/leads/${id}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, done: !currentDone }),
    })
    if (!res.ok) {
      // Revert on failure
      setChecklist((prev) => prev.map((c) => c.key === key ? { ...c, done: currentDone } : c))
      setError('Failed to update checklist')
    }
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setError(null)
    const res = await fetch(`/api/leads/${id}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moved_by: 'josh' }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error + (data.missing ? ` (missing: ${data.missing.join(', ')})` : ''))
    } else {
      setSuccessMsg(`Advanced to: ${data.new_stage}`)
      setTimeout(() => router.push(`/leads/${id}`), 1500)
    }
    setAdvancing(false)
  }

  const requiredItems = checklist.filter((c) => c.required)
  const allRequiredDone = requiredItems.every((c) => c.done)
  const doneCount = checklist.filter((c) => c.done).length
  const progress = checklist.length > 0 ? (doneCount / checklist.length) * 100 : 0

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.header}>
          <div>
            <h1 className="page-title">Stage Checklist</h1>
            <p className="page-subtitle">
              Current stage: <strong style={{ color: 'var(--accent-light)' }}>{stage.replace(/-/g, ' ')}</strong>
            </p>
          </div>
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>{doneCount} / {checklist.length} done</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {loading && <div className="loading-spinner"><div className="spinner" /></div>}

        {!loading && checklist.length === 0 && (
          <div className="empty-state">
            <h3>No checklist for this stage</h3>
            <p>You can advance directly.</p>
          </div>
        )}

        {!loading && checklist.length > 0 && (
          <div className={styles.list}>
            {checklist.map((item) => (
              <div
                key={item.key}
                className={`${styles.item} ${item.done ? styles.itemDone : ''}`}
                onClick={() => toggleItem(item.key, item.done)}
              >
                <div className={`${styles.checkbox} ${item.done ? styles.checkboxDone : ''}`}>
                  {item.done && <span>✓</span>}
                </div>
                <div className={styles.itemContent}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  {item.required && !item.done && (
                    <span className="badge badge-danger" style={{ fontSize: 11 }}>Required</span>
                  )}
                  {item.required && item.done && (
                    <span className="badge badge-success" style={{ fontSize: 11 }}>✓ Required</span>
                  )}
                  {!item.required && (
                    <span className="badge badge-default" style={{ fontSize: 11 }}>Optional</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>⚠ {error}</div>
        )}

        {successMsg && (
          <div className={styles.successBox}>✓ {successMsg}</div>
        )}

        {!loading && (
          <div className={styles.advanceSection}>
            {!allRequiredDone && requiredItems.length > 0 && (
              <p className={styles.blockNote}>
                Complete all required items to advance to the next stage.
              </p>
            )}
            <button
              className="btn btn-primary"
              onClick={handleAdvance}
              disabled={!allRequiredDone || advancing}
              style={{ fontSize: 15, padding: '12px 28px' }}
            >
              {advancing ? 'Advancing…' : 'Advance Stage →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
