'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import styles from './meetings.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meeting {
  id: string
  week_label: string
  week_start: string
  meeting_date: string
  meeting_name: string
  owner: string | null
  meeting_time: string | null
  attendees: string | null
  status: 'happened' | 'didnt_happen' | 'future' | null
  reason: string | null
}

interface TeamMember {
  id: string
  name: string
}

interface NewMeetingForm {
  meeting_date: string
  meeting_name: string
  owner: string
  meeting_time: string
  attendees: string[]    // array of names
  attendees_custom: string  // free-text for non-team members
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(d: Date) {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
  dt.setDate(diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmtWeekLabel(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const s = monday.toLocaleDateString('en-US', opts)
  const e = sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${s} – ${e}`
}

function fmtDisplayDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupByDate(meetings: Meeting[]) {
  const groups: Record<string, Meeting[]> = {}
  for (const m of meetings) {
    if (!groups[m.meeting_date]) groups[m.meeting_date] = []
    groups[m.meeting_date].push(m)
  }
  return groups
}

const STATUS_COLORS: Record<string, string> = {
  happened: '#059669',
  didnt_happen: '#DC2626',
  future: '#6B7280',
}

const STATUS_LABELS: Record<string, string> = {
  happened: '● Happened',
  didnt_happen: '● Didn\'t Happen',
  future: '○ Future',
}

// ─── Attendees Multi-Select Combobox ─────────────────────────────────────────

function AttendeesCombobox({
  teamMembers,
  value,
  customValue,
  onChange,
  onCustomChange,
}: {
  teamMembers: TeamMember[]
  value: string[]
  customValue: string
  onChange: (names: string[]) => void
  onCustomChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (name: string) => {
    const next = value.includes(name) ? value.filter(n => n !== name) : [...value, name]
    onChange(next)
  }

  const displayLabel = value.length === 0
    ? 'Select team members…'
    : value.join(', ')

  return (
    <div className={styles.comboboxWrap} ref={ref}>
      <button type="button" className={styles.comboboxTrigger} onClick={() => setOpen(o => !o)}>
        <span className={value.length ? styles.comboboxValueSet : styles.comboboxPlaceholder}>
          {displayLabel}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.comboboxDropdown}>
          <div className={styles.comboboxHeader}>Team Members</div>
          {teamMembers.map(tm => (
            <label key={tm.id} className={styles.comboboxItem}>
              <input
                type="checkbox"
                checked={value.includes(tm.name)}
                onChange={() => toggle(tm.name)}
                className={styles.comboboxCheckbox}
              />
              <span className={styles.checkName}>{tm.name}</span>
            </label>
          ))}
          <div className={styles.comboboxDivider} />
          <div className={styles.comboboxHeader}>Other / Manual</div>
          <div style={{ padding: '6px 10px' }}>
            <input
              type="text"
              value={customValue}
              onChange={e => onCustomChange(e.target.value)}
              placeholder="Type name(s), comma-separated…"
              className={styles.comboboxCustomInput}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add / Edit Meeting Modal ─────────────────────────────────────────────────

function MeetingModal({
  weekStart,
  teamMembers,
  onSave,
  onClose,
}: {
  weekStart: string
  teamMembers: TeamMember[]
  onSave: (m: Meeting) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<NewMeetingForm>({
    meeting_date: weekStart,
    meeting_name: '',
    owner: '',
    meeting_time: '',
    attendees: [],
    attendees_custom: '',
  })
  const [saving, setSaving] = useState(false)

  const buildAttendeesString = () => {
    const parts: string[] = [...form.attendees]
    if (form.attendees_custom.trim()) {
      const extra = form.attendees_custom.split(',').map(s => s.trim()).filter(Boolean)
      parts.push(...extra)
    }
    return parts.join(', ')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.meeting_name.trim()) return
    setSaving(true)
    try {
      const monday = new Date(weekStart + 'T00:00:00')
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_date: form.meeting_date,
          meeting_name: form.meeting_name,
          owner: form.owner || null,
          meeting_time: form.meeting_time || null,
          attendees: buildAttendeesString() || null,
          week_start: weekStart,
          week_label: fmtWeekLabel(monday),
          status: 'future',
        }),
      })
      const data = await res.json()
      onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Add Meeting</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formRow}>
            <label>Date</label>
            <input
              type="date"
              value={form.meeting_date}
              onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))}
            />
          </div>

          <div className={styles.formRow}>
            <label>Meeting Name *</label>
            <input
              type="text"
              value={form.meeting_name}
              placeholder="e.g. Daily Recruiter Catch Up"
              onChange={e => setForm(f => ({ ...f, meeting_name: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div className={styles.formRow}>
            <label>Owner</label>
            <select
              value={form.owner}
              onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
              className={styles.selectInput}
            >
              <option value="">— Select owner —</option>
              {teamMembers.map(tm => (
                <option key={tm.id} value={tm.name}>{tm.name}</option>
              ))}
              <option value="_other">Other (type below)</option>
            </select>
            {form.owner === '_other' && (
              <input
                type="text"
                placeholder="Type owner name…"
                style={{ marginTop: 6 }}
                onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
              />
            )}
          </div>

          <div className={styles.formRow}>
            <label>Time</label>
            <input
              type="text"
              value={form.meeting_time}
              placeholder="e.g. 10:00 AM  ·  Floating  ·  —"
              onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))}
            />
          </div>

          <div className={styles.formRow}>
            <label>Attendees</label>
            <AttendeesCombobox
              teamMembers={teamMembers}
              value={form.attendees}
              customValue={form.attendees_custom}
              onChange={names => setForm(f => ({ ...f, attendees: names }))}
              onCustomChange={v => setForm(f => ({ ...f, attendees_custom: v }))}
            />
            {(form.attendees.length > 0 || form.attendees_custom.trim()) && (
              <div className={styles.attendeePreview}>
                <span className={styles.attendeePreviewLabel}>Preview:</span>
                {[...form.attendees, ...form.attendees_custom.split(',').map(s => s.trim()).filter(Boolean)].map((name, i) => (
                  <span key={i} className={styles.attendeeTag}>{name}</span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.modalActions}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Add Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({
  meeting,
  onUpdate,
}: {
  meeting: Meeting
  onUpdate: (id: string, status: Meeting['status'], reason?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState(meeting.reason || '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const status = meeting.status

  // close when clicking outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowReason(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSelect = (s: Meeting['status']) => {
    if (s === 'didnt_happen') {
      setShowReason(true)
      setOpen(false)
    } else {
      onUpdate(meeting.id, s)
      setOpen(false)
    }
  }

  const handleReasonSave = () => {
    onUpdate(meeting.id, 'didnt_happen', reason)
    setShowReason(false)
  }

  return (
    <div className={styles.statusWrapper} ref={wrapRef}>
      <button
        className={styles.statusPill}
        style={{ color: STATUS_COLORS[status || 'future'] }}
        onClick={() => { setOpen(o => !o); setShowReason(false) }}
      >
        {STATUS_LABELS[status || 'future']}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={styles.statusDropdown}>
          {(['happened', 'didnt_happen', 'future'] as const).map(s => (
            <button
              key={s}
              className={`${styles.dropdownItem} ${status === s ? styles.dropdownItemActive : ''}`}
              style={{ color: STATUS_COLORS[s] }}
              onClick={() => handleSelect(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {showReason && (
        <div className={styles.reasonPopup}>
          <div className={styles.reasonPopupTitle}>Why didn&apos;t it happen?</div>
          <input
            type="text"
            className={styles.reasonInput}
            placeholder="e.g. Cancelled, No show, Rescheduled…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleReasonSave()
              if (e.key === 'Escape') setShowReason(false)
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '6px 0', fontSize: 12 }} onClick={handleReasonSave}>
              Save Reason
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowReason(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inline Reason Cell ───────────────────────────────────────────────────────

function InlineReason({ meeting, onUpdate }: { meeting: Meeting; onUpdate: (id: string, status: Meeting['status'], reason?: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(meeting.reason || '')

  if (meeting.status !== 'didnt_happen') {
    return <span className={styles.dash}>—</span>
  }

  if (editing) {
    return (
      <input
        className={styles.reasonEditInput}
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onUpdate(meeting.id, 'didnt_happen', draft); setEditing(false) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onUpdate(meeting.id, 'didnt_happen', draft); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <span
      className={styles.reasonTextEditable}
      onClick={() => { setDraft(meeting.reason || ''); setEditing(true) }}
      title="Click to edit reason"
    >
      {meeting.reason || <span className={styles.reasonEmpty}>+ add reason</span>}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.4 }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const [currentWeek, setCurrentWeek] = useState<Date>(() => getMonday(new Date()))
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const weekStartISO = isoDate(currentWeek)
  const weekLabel = fmtWeekLabel(currentWeek)

  const happened = meetings.filter(m => m.status === 'happened').length
  const didntHappen = meetings.filter(m => m.status === 'didnt_happen').length
  const future = meetings.filter(m => !m.status || m.status === 'future').length
  const total = meetings.length
  const happenedPct = total > 0 ? Math.round((happened / total) * 100) : 0

  const groupedMeetings = useMemo(() => groupByDate(meetings), [meetings])
  const sortedDates = useMemo(() => Object.keys(groupedMeetings).sort(), [groupedMeetings])

  // Load team members from referral_partners once
  useEffect(() => {
    fetch('/api/referrals')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTeamMembers(data.map((d: any) => ({ id: d.id, name: d.name })))
      })
      .catch(() => {})
  }, [])

  const fetchMeetings = useCallback(async (weekISO: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meetings?week_start=${weekISO}`)
      const data = await res.json()
      setMeetings(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMeetings(weekStartISO) }, [weekStartISO, fetchMeetings])

  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d) }
  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d) }
  const goToday = () => setCurrentWeek(getMonday(new Date()))

  const handleStatusUpdate = useCallback(async (id: string, status: Meeting['status'], reason?: string) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, status, reason: reason !== undefined ? reason : m.reason } : m))
    await fetch('/api/meetings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, reason }),
    })
  }, [])

  const handleAddMeeting = useCallback((m: Meeting) => {
    setMeetings(prev => [...prev, m].sort((a, b) => a.meeting_date.localeCompare(b.meeting_date)))
    setShowAddModal(false)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this meeting?')) return
    setDeletingId(id)
    setMeetings(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/meetings?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
  }, [])

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>HELM — Meeting Tracker</h1>
          <p className={styles.pageSubtitle}>Track weekly meeting cadences, statuses, and attendance</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Meeting
        </button>
      </div>

      {/* ── Week Navigator ── */}
      <div className={styles.weekNav}>
        <button className={styles.weekNavBtn} onClick={prevWeek}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className={styles.weekLabel}>
          <span className={styles.weekLabelText}>{weekLabel}</span>
          <span className={styles.weekLabelCount}>{total} meeting{total !== 1 ? 's' : ''} scheduled</span>
        </div>
        <button className={styles.weekNavBtn} onClick={nextWeek}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button className={styles.todayBtn} onClick={goToday}>This Week</button>
      </div>

      {/* ── Stats Strip ── */}
      <div className={styles.statsStrip}>
        <div className={styles.statChip}>
          <span className={styles.statDot} style={{ background: '#6B7280' }} />
          <span className={styles.statVal}>{future}</span>
          <span className={styles.statLabel}>Future / No Status</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statChip}>
          <span className={styles.statDot} style={{ background: '#059669' }} />
          <span className={styles.statVal}>{happened}</span>
          <span className={styles.statLabel}>Happened</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statChip}>
          <span className={styles.statDot} style={{ background: '#DC2626' }} />
          <span className={styles.statVal}>{didntHappen}</span>
          <span className={styles.statLabel}>Didn&apos;t Happen</span>
        </div>
        <div style={{ flex: 1 }} />
        <div className={styles.statChip}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${happenedPct}%` }} />
          </div>
          <span className={styles.statVal} style={{ color: 'var(--accent)' }}>{happenedPct}%</span>
          <span className={styles.statLabel}>completion rate</span>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading meetings…</span>
        </div>
      ) : total === 0 ? (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p>No meetings this week.</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add First Meeting</button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ minWidth: 130 }}>Date</th>
                <th style={{ minWidth: 200 }}>Meeting</th>
                <th style={{ minWidth: 90 }}>Owner</th>
                <th style={{ minWidth: 100 }}>Time</th>
                <th style={{ minWidth: 200 }}>Attendees</th>
                <th style={{ minWidth: 150 }}>Status</th>
                <th style={{ minWidth: 200 }}>Reason if Didn&apos;t Happen</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedDates.map(date => {
                const dayMeetings = groupedMeetings[date]
                return dayMeetings.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`${styles.row} ${m.status === 'happened' ? styles.rowHappened : ''} ${m.status === 'didnt_happen' ? styles.rowMissed : ''}`}
                  >
                    {idx === 0 && (
                      <td rowSpan={dayMeetings.length} className={styles.dateCell}>
                        <span className={styles.dateLabel}>{fmtDisplayDate(date)}</span>
                      </td>
                    )}
                    <td className={styles.meetingNameCell}>{m.meeting_name}</td>
                    <td className={styles.ownerCell}>
                      {m.owner ? (
                        <span className={styles.ownerBadge}>{m.owner}</span>
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </td>
                    <td className={styles.timeCell}>
                      <span className={styles.time}>{m.meeting_time || '—'}</span>
                    </td>
                    <td className={styles.attendeesCell}>
                      {m.attendees ? (
                        <div className={styles.attendeeTagsRow}>
                          {m.attendees.split(',').map((a, i) => (
                            <span key={i} className={styles.attendeeTagSmall}>{a.trim()}</span>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </td>
                    <td className={styles.statusCell}>
                      <StatusPill meeting={m} onUpdate={handleStatusUpdate} />
                    </td>
                    <td className={styles.reasonCell}>
                      <InlineReason meeting={m} onUpdate={handleStatusUpdate} />
                    </td>
                    <td className={styles.actionCell}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        title="Delete meeting"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && (
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Legend:</span>
          <span style={{ color: '#059669' }}>● Happened</span>
          <span style={{ color: '#DC2626' }}>● Didn&apos;t Happen</span>
          <span style={{ color: '#6B7280' }}>○ Future / No Status</span>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAddModal && (
        <MeetingModal
          weekStart={weekStartISO}
          teamMembers={teamMembers}
          onSave={handleAddMeeting}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
