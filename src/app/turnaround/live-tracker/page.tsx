'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './tracker.module.css'
import AirtableBadge from '@/components/AirtableBadge'

export default function LiveRoleTracker() {
  const [roles, setRoles] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [recStages, setRecStages] = useState<any[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [leadSetupModalId, setLeadSetupModalId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        rolesRes, leadsRes, recRes, stageConfigRes, customStagesRes, customStatusRes, recStagesRes
      ] = await Promise.all([
        fetch('/api/turnaround/roles').then(r => r.json()),
        fetch('/api/leads').then(r => r.json()),
        supabase.from('referral_partners').select('*').order('name'),
        supabase.from('pipeline_stage_config').select('label'),
        fetch('/api/turnaround/stages').then(r => r.json()),
        fetch('/api/turnaround/statuses').then(r => r.json()),
        fetch('/api/turnaround/recruitment-stages').then(r => r.json())
      ])

      setRoles(Array.isArray(rolesRes) ? rolesRes : [])
      setLeads(Array.isArray(leadsRes) ? leadsRes : [])
      setRecruiters(recRes.data || [])
      
      const stg = new Set<string>()
      stageConfigRes.data?.forEach((s: any) => stg.add(s.label))
      if (Array.isArray(customStagesRes)) customStagesRes.forEach(s => stg.add(s.label))
      setStages(Array.from(stg))

      const sts = new Set<string>()
      if (Array.isArray(customStatusRes)) customStatusRes.forEach(s => sts.add(s.label))
      setStatuses(Array.from(sts))

      setRecStages(Array.isArray(recStagesRes) ? recStagesRes : [])

    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRow = async () => {
    try {
      const res = await fetch('/api/turnaround/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: '', status: 'Active' })
      })
      const newRow = await res.json()
      setRoles([newRow, ...roles])
    } catch(err) {
      console.error(err)
    }
  }

  const handleUpdate = async (id: string, field: string, value: any) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

    try {
      await fetch(`/api/turnaround/roles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (field === 'lead_id') {
         fetchData() // Refresh to grab joined data
      }
    } catch (err) {
      console.error(err)
    }
  }

  const calculateDays = (target: string | null) => {
    if (!target) return null
    const targetDate = new Date(target)
    if (isNaN(targetDate.getTime())) return null
    const today = new Date()
    targetDate.setHours(0,0,0,0)
    today.setHours(0,0,0,0)
    
    const diffTime = targetDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusColor = (status: string): any => {
    if (status === 'Placed') return 'blue'
    if (status === 'Active') return 'green'
    if (status === 'Paused') return 'yellow'
    if (status === 'Archived') return 'gray'
    return 'gray'
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" />Loading Data...</div>

  const totalActive = roles.filter(r => r.status === 'Active').length
  const totalPlaced = roles.filter(r => r.status === 'Placed').length
  const totalOverdue = roles.filter(r => {
    const days = calculateDays(r.target_placement_date)
    return days !== null && days < 0 && r.status !== 'Placed'
  }).length
  const totalDueIn5 = roles.filter(r => {
    const days = calculateDays(r.target_placement_date)
    return days !== null && days >= 0 && days <= 5 && r.status !== 'Placed'
  }).length

  const urgentRoles: { roleName: string; clientName: string; daysLeft: number }[] = []
  
  roles.filter(r => r.status !== 'Placed' && r.status !== 'Archived').forEach(r => {
    const days = calculateDays(r.target_placement_date)
    if (days !== null && days <= 7) {
      urgentRoles.push({
        roleName: r.role || 'Unnamed Role',
        clientName: r.order_leads?.contact_name || r.order_leads?.company_name || r.manual_client_name || 'No Client',
        daysLeft: days
      })
    }
  })
  
  urgentRoles.sort((a,b) => a.daysLeft - b.daysLeft)
  const top3UrgentRoles = urgentRoles.slice(0, 3)

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#111' }}>Trackers</h2>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)} 
            />
            Show Archived
          </label>
        </div>
        <button onClick={handleAddRow} className={styles.actionButton}>+ Add Role</button>
      </div>

      {top3UrgentRoles.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <div style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚡</span> Urgent Roles Focus
          </div>
          <div style={{ width: 1, height: 24, background: '#FDE68A', margin: '0 4px' }} />
          {top3UrgentRoles.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              {u.daysLeft < 0 ? (
                <span style={{ color: '#DC2626', fontWeight: 600, background: '#FEE2E2', padding: '2px 6px', borderRadius: 4 }}>{Math.abs(u.daysLeft)}d OVERDUE</span>
              ) : (
                <span style={{ color: '#D97706', fontWeight: 600, background: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>DUE IN {u.daysLeft}d</span>
              )}
              <span style={{ fontWeight: 600, color: '#111' }}>{u.roleName}</span>
              <span style={{ color: 'var(--text-muted)' }}>({u.clientName})</span>
              {i < top3UrgentRoles.length - 1 && <span style={{ margin: '0 8px', color: '#D1D5DB' }}>•</span>}
            </div>
          ))}
        </div>
      )}

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Active Roles</div>
          <div className={styles.kpiValue}>{totalActive}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Placed</div>
          <div className={`${styles.kpiValue} ${styles.kpiSuccess}`}>{totalPlaced}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Overdue</div>
          <div className={totalOverdue > 0 ? `${styles.kpiValue} ${styles.kpiAlert}` : styles.kpiValue}>{totalOverdue}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Due in 5 Days</div>
          <div className={styles.kpiValue} style={totalDueIn5 > 0 ? { color: '#D97706' } : {}}>{totalDueIn5}</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 250 }}>Client / Lead Name</th>
              <th style={{ width: 180 }}>Role</th>
              <th style={{ width: 130 }}>Start Date</th>
              <th style={{ width: 180 }}>Pipeline Stage</th>
              <th style={{ width: 180 }}>Recruitment Stage</th>
              <th style={{ width: 130 }}>Target Placement</th>
              <th style={{ width: 100 }}>Days Left</th>
              <th style={{ width: 130 }}>Placed On</th>
              <th style={{ width: 180 }}>Recruiter</th>
              <th style={{ width: 150 }}>Placed By</th>
              <th style={{ width: 140 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {roles.filter(r => showArchived || r.status !== 'Archived').map(r => {
              const daysToPlacement = calculateDays(r.target_placement_date)
              const isOverdue = daysToPlacement !== null && daysToPlacement < 0 && r.status !== 'Placed'
              const currentMilestone = Array.isArray(r.milestones_json) 
                ? r.milestones_json.find((m: any) => !m.is_achieved && !m.is_missed) 
                : null
              const hasMissed = Array.isArray(r.milestones_json) && r.milestones_json.some((m: any) => m.is_missed)

              return (
                <tr key={r.id}>
                  {/* Client Name Cell */}
                  <td>
                    {leadSetupModalId === r.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
                        <input 
                          autoFocus 
                          className={styles.input} 
                          placeholder="Native Lead Name" 
                          id={`lead_name_${r.id}`} 
                        />
                        <select className={styles.select} id={`lead_stg_${r.id}`}>
                          <option value="">Select Pipeline Stage...</option>
                          {stages.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary" style={{ flex: 1, padding: '4px 0', fontSize: 11 }} onClick={async () => {
                            const nm = (document.getElementById(`lead_name_${r.id}`) as HTMLInputElement).value
                            const st = (document.getElementById(`lead_stg_${r.id}`) as HTMLInputElement).value
                            if (!nm || !st) return alert('Name and Stage required')
                            const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_name: nm, current_stage: st }) })
                            const data = await res.json()
                            if (data.id) {
                              await handleUpdate(r.id, 'lead_id', data.id)
                              setLeadSetupModalId(null)
                            }
                          }}>Create</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setLeadSetupModalId(null)}>✕</button>
                        </div>
                      </div>
                    ) : !r.lead_id && !r.manual_client_name ? (
                      <select 
                        className={styles.select}
                        value=""
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'manual') setLeadSetupModalId(r.id)
                          else if (val === 'legacy_manual') handleUpdate(r.id, 'manual_client_name', 'New Manual Client')
                          else handleUpdate(r.id, 'lead_id', val)
                        }}
                      >
                        <option value="">Select Lead...</option>
                        <option value="legacy_manual">-- Setup Text-Only Client --</option>
                        <option value="manual">-- Create Native Lead --</option>
                        {leads.map(l => (
                          <option key={l.id} value={l.id}>{l.contact_name || l.company_name}</option>
                        ))}
                      </select>
                    ) : r.lead_id ? (
                      <div className={styles.badgeCell} style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{r.order_leads?.contact_name || r.order_leads?.company_name || 'Linked Lead'}</span>
                        <button style={{ fontSize: 10, cursor: 'pointer', border: 'none', background: 'none', color: '#999' }} onClick={() => handleUpdate(r.id, 'lead_id', null)}>✕</button>
                      </div>
                    ) : (
                      <div className={styles.badgeCell} style={{ justifyContent: 'space-between' }}>
                        <input 
                          className={styles.input}
                          style={{ margin: 0 }}
                          value={r.manual_client_name || ''}
                          onChange={(e) => handleUpdate(r.id, 'manual_client_name', e.target.value)}
                          placeholder="Client Name"
                        />
                        <button style={{ fontSize: 10, cursor: 'pointer', border: 'none', background: 'none', color: '#999', paddingLeft: 4 }} onClick={() => handleUpdate(r.id, 'manual_client_name', null)}>✕</button>
                      </div>
                    )}
                  </td>

                  {/* Role Title */}
                  <td>
                    <input 
                      className={styles.input}
                      value={r.role || ''}
                      onChange={(e) => handleUpdate(r.id, 'role', e.target.value)}
                      placeholder="Role Title"
                    />
                  </td>

                  {/* Start Date */}
                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={r.start_date || r.order_leads?.created_at?.split('T')[0] || ''}
                      onChange={(e) => handleUpdate(r.id, 'start_date', e.target.value)}
                    />
                  </td>

                  {/* Pipeline Stage */}
                  <td>
                    <select 
                      className={styles.select}
                      value={r.pipeline_stage || ''}
                      onChange={(e) => handleUpdate(r.id, 'pipeline_stage', e.target.value)}
                    >
                      <option value="">Select...</option>
                      {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>

                  {/* Recruitment Stage (Milestone Read-only) */}
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', padding: '6px 0' }}>
                      {hasMissed && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: 4, width: 'fit-content', marginBottom: currentMilestone ? 4 : 0, fontSize: 10, fontWeight: 700 }}>
                          <span style={{ fontSize: 10 }}>⚠</span> MISSED
                        </div>
                      )}
                      {currentMilestone && !hasMissed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                          {currentMilestone.label}
                        </div>
                      ) : currentMilestone && hasMissed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          Next: {currentMilestone.label}
                        </div>
                      ) : !currentMilestone && Array.isArray(r.milestones_json) && r.milestones_json.length > 0 && !hasMissed ? (
                        <div style={{ color: '#059669', fontWeight: 600 }}>✓ All Achieved</div>
                      ) : !currentMilestone && !hasMissed ? (
                        <div style={{ color: 'var(--text-muted)' }}>No Active Milestone</div>
                      ) : null}
                    </div>
                  </td>

                  {/* Target Placement */}
                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={r.target_placement_date || ''}
                      onChange={(e) => handleUpdate(r.id, 'target_placement_date', e.target.value)}
                    />
                  </td>

                  {/* Days Left */}
                  <td style={{ textAlign: 'center' }}>
                    <div className={styles.centered} style={{ fontWeight: 600, color: isOverdue ? '#d12e2e' : 'inherit' }}>
                      {daysToPlacement !== null ? (daysToPlacement > 0 ? `+${daysToPlacement}` : daysToPlacement) : '-'}
                    </div>
                  </td>

                  {/* Placed On */}
                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={r.placed_on || ''}
                      onChange={(e) => handleUpdate(r.id, 'placed_on', e.target.value)}
                    />
                  </td>

                  {/* Recruiter */}
                  <td>
                    <div className={styles.comboboxWrap} style={{ position: 'relative' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { document.getElementById(`dropdown_${r.id}`)!.style.display = 'none'; } }}>
                      <button 
                        type="button" 
                        className={styles.select} 
                        onClick={() => {
                          const popup = document.getElementById(`dropdown_${r.id}`)!
                          popup.style.display = popup.style.display === 'block' ? 'none' : 'block'
                        }} 
                        style={{ width: '100%', textAlign: 'left', minHeight: 32, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {Array.isArray(r.recruiters_json) && r.recruiters_json.length > 0
                            ? recruiters.filter(rec => r.recruiters_json.includes(rec.id)).map(rec => rec.name).join(', ')
                            : 'Select recruiters…'}
                        </span>
                      </button>
                      <div id={`dropdown_${r.id}`} style={{ display: 'none', position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                        {recruiters.map(rec => {
                          const selected = Array.isArray(r.recruiters_json) && r.recruiters_json.includes(rec.id)
                          return (
                            <label key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  let next = Array.isArray(r.recruiters_json) ? [...r.recruiters_json] : []
                                  if (selected) next = next.filter(n => n !== rec.id)
                                  else next.push(rec.id)
                                  handleUpdate(r.id, 'recruiters_json', next)
                                }}
                              />
                              <span>{rec.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </td>

                  {/* Placed By */}
                  <td>
                    <input 
                      className={styles.input}
                      value={r.placed_by || ''}
                      onChange={(e) => handleUpdate(r.id, 'placed_by', e.target.value)}
                      placeholder="Placed By"
                    />
                  </td>

                  {/* Status */}
                  <td>
                    <div className={styles.badgeCell}>
                      <AirtableBadge 
                        label={r.status || 'Active'} 
                        color={getStatusColor(r.status)} 
                        style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}
                      />
                      <select 
                        className={styles.select} 
                        style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                        value={r.status || 'Active'}
                        onChange={(e) => handleUpdate(r.id, 'status', e.target.value)}
                      >
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="Active">Active</option>
                        <option value="Placed">Placed</option>
                        <option value="Paused">Paused</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
