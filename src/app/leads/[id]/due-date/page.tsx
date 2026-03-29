'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { PipelineStageConfig } from '@/lib/types'
import styles from './due-date.module.css'

function DueDateForm() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [stages, setStages] = useState<PipelineStageConfig[]>([])
  const [selectedStage, setSelectedStage] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [setBy, setSetBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState('')

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((leadData) => {
        const config: PipelineStageConfig[] = leadData.stage_config ?? []
        setStages(config)
        const cs: string = leadData.lead?.current_stage ?? ''
        setCurrentStage(cs)
        setSelectedStage(cs)

        const existing = (leadData.due_dates ?? []).find(
          (d: { stage: string; due_at: string }) => d.stage === cs
        )
        if (existing) {
          setDueAt(new Date(existing.due_at).toISOString().slice(0, 16))
        }
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStage || !dueAt) return
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/leads/${id}/due-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: selectedStage, due_at: new Date(dueAt).toISOString(), set_by: setBy || undefined }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else {
      setSaved(true)
      setTimeout(() => router.push(`/leads/${id}`), 1500)
    }
    setSaving(false)
  }

  return (
    <div className={styles.inner}>
      <div className={styles.header}>
        <h1 className={styles.title}>Set Due Date</h1>
        <p className={styles.subtitle}>Set or update the deadline for any pipeline stage on this lead.</p>
      </div>

      <div className={styles.formWrap}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="label" htmlFor="stage-select">Pipeline Stage</label>
            <select
              id="stage-select"
              className="input"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              required
            >
              <option value="">Select a stage…</option>
              {stages.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.label}{s.stage === currentStage ? ' ← current' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="due-at">Due Date & Time</label>
            <input
              id="due-at"
              type="datetime-local"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="set-by">Set by (optional)</label>
            <input
              id="set-by"
              type="text"
              className="input"
              value={setBy}
              onChange={(e) => setSetBy(e.target.value)}
              placeholder="e.g. josh, slack-bot"
            />
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}
          {saved && <div className={styles.successBox}>✓ Due date saved! Redirecting…</div>}

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
            {saving ? 'Saving…' : 'Set Due Date'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DueDatePage() {
  return (
    <Suspense fallback={<div className="loading-spinner"><div className="spinner" /></div>}>
      <DueDateForm />
    </Suspense>
  )
}
