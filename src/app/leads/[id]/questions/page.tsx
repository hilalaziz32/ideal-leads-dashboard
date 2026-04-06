'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { INTAKE_GROUPS } from '@/lib/intake-questions'
import styles from './questions.module.css'

// The answers map is keyed by question id, value is the answer string
type AnswerMap = Record<string, string>

// Convert answers map → order_leads.questions format (QuestionAnswer[])
function toStorageFormat(answers: AnswerMap) {
  return Object.entries(answers)
    .filter(([, v]) => v.trim() !== '')
    .map(([id, answer]) => {
      // Find label from INTAKE_GROUPS
      for (const g of INTAKE_GROUPS) {
        const q = g.questions.find((q) => q.id === id)
        if (q) return { question: `[${q.id}] ${q.label}`, answer, id }
      }
      return { question: id, answer, id }
    })
}

// Convert storage format back to answers map
function fromStorageFormat(stored: Array<{ question: string; answer: string; id?: string }>): AnswerMap {
  const map: AnswerMap = {}
  for (const item of stored) {
    const idMatch = item.question.match(/^\[([^\]]+)\]/)
    const key = item.id ?? (idMatch ? idMatch[1] : item.question)
    map[key] = item.answer
  }
  return map
}

export default function QuestionsPage() {
  const { id } = useParams<{ id: string }>()
  const [leadName, setLeadName] = useState<string>('')
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['customer']))
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setLeadName(data.lead?.contact_name ?? 'Unknown Lead')
        const existing = data.lead?.questions ?? []
        setAnswers(fromStorageFormat(existing))
      })
      .catch(() => setError('Failed to load lead'))
      .finally(() => setLoading(false))
  }, [id])

  // Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSaveNow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answers])

  const saveAnswers = useCallback(async (currentAnswers: AnswerMap) => {
    setSaving(true)
    const res = await fetch(`/api/leads/${id}/questions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: toStorageFormat(currentAnswers) }),
    })
    if (res.ok) setLastSaved(new Date())
    else setError('Auto-save failed')
    setSaving(false)
  }, [id])

  const handleChange = (questionId: string, value: string) => {
    const updated = { ...answers, [questionId]: value }
    setAnswers(updated)
    // Debounced auto-save — 1.5s after last keystroke
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveAnswers(updated), 1500)
  }

  const handleSaveNow = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    saveAnswers(answers)
  }

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const answeredCount = Object.values(answers).filter((v) => v.trim() !== '').length
  const totalQuestions = INTAKE_GROUPS.reduce((s, g) => s + g.questions.length, 0)

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /><span>Loading questions…</span></div>
  }

  return (
    <div className={styles.page}>
      {/* Header bar */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Intake Questions</h1>
          <p className={styles.subtitle}>
            <span className={styles.leadChip}>Lead: {leadName}</span>
            <span className={styles.progressPill}>
              {answeredCount} / {totalQuestions} answered
            </span>
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.shortcutHint}>⌘ S</span>
          {lastSaved && (
            <span className={styles.savedAt}>
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {saving && <span className={styles.savingLabel}>Saving…</span>}
          <button className="btn btn-primary" onClick={handleSaveNow} disabled={saving}>
            Save Now
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {/* Progress bar */}
      <div className={styles.progressBarWrap}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
        />
      </div>

      {/* Group accordions */}
      <div className={styles.groups}>
        {INTAKE_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.key)
          const groupAnswered = group.questions.filter((q) => answers[q.id]?.trim()).length
          const groupRequired = group.questions.filter((q) => q.required)
          const requiredDone = groupRequired.filter((q) => answers[q.id]?.trim()).length

          return (
            <div key={group.key} className={`${styles.group} ${isOpen ? styles.groupOpen : ''}`}>
              <button
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.key)}
              >
                <span className={styles.groupChevron}>{isOpen ? '▾' : '▸'}</span>
                <span className={styles.groupTitle}>{group.title}</span>
                <span className={styles.groupStats}>
                  <span className={styles.groupCount}>{groupAnswered}/{group.questions.length}</span>
                  {groupRequired.length > 0 && (
                    <span className={`${styles.requiredChip} ${requiredDone === groupRequired.length ? styles.requiredDone : ''}`}>
                      {requiredDone}/{groupRequired.length} required
                    </span>
                  )}
                </span>
              </button>

              {isOpen && (
                <div className={styles.groupBody}>
                  {group.questions.map((q) => {
                    const hasAnswer = answers[q.id]?.trim()
                    return (
                      <div
                        key={q.id}
                        className={`${styles.qRow} ${hasAnswer ? styles.qRowAnswered : ''}`}
                      >
                        <div className={styles.qContent}>
                          <div className={styles.qHeaderRow}>
                            <span className={styles.qId}>{q.id}</span>
                            {q.required && <span className={styles.qRequired}>Required</span>}
                          </div>
                          <label className={styles.qLabel} htmlFor={`q-${q.id}`}>
                            {q.label}
                          </label>
                          <p className={styles.qPrompt}>{q.prompt}</p>
                          <textarea
                            id={`q-${q.id}`}
                            className={`input ${styles.qTextarea}`}
                            value={answers[q.id] ?? ''}
                            onChange={(e) => handleChange(q.id, e.target.value)}
                            placeholder="Josh's notes / answer…"
                            rows={1}
                          />
                        </div>
                        <div className={styles.qStatus}>
                          {hasAnswer ? (
                            <span className={styles.doneCheck}>✓</span>
                          ) : (
                            <span className={styles.emptyDot} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
