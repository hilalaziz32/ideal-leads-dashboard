'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './milestones.module.css'

export default function LiveMilestones() {
  const [roles, setRoles] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [recStages, setRecStages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [leadSetupId, setLeadSetupId] = useState<string | null>(null)
  const [activeRoleModal, setActiveRoleModal] = useState<string | null>(null)
  useEffect(() => {
    fetchData()
  }, [])
  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        rolesRes, leadsRes, recRes, recStagesRes
      ] = await Promise.all([
        fetch('/api/turnaround/roles').then(r => r.json()),
        fetch('/api/leads').then(r => r.json()),
        supabase.from('referral_partners').select('*').order('name'),
        fetch('/api/turnaround/recruitment-stages').then(r => r.json())
      ])

      setRoles(Array.isArray(rolesRes) ? rolesRes : [])
      setLeads(Array.isArray(leadsRes) ? leadsRes : [])
      setRecruiters(recRes.data || [])
      setRecStages(Array.isArray(recStagesRes) ? recStagesRes : [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, field: string, value: any) => {
    // Optimistic UI Update
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

    try {
      await fetch(`/api/turnaround/roles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (field === 'lead_id') {
         fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const calculateAutoDate = (baseDate: string | null, daysToAdd: number) => {
    if (!baseDate) return ''
    const d = new Date(baseDate)
    if (isNaN(d.getTime())) return ''
    d.setUTCDate(d.getUTCDate() + daysToAdd)
    return d.toISOString().split('T')[0]
  }

  const getMilestones = (r: any) => {
    let m = Array.isArray(r.milestones_json) ? r.milestones_json : []
    if (m.length === 0) {
      m = recStages.filter(s => s.label !== 'Recruiting').map(s => ({
        id: s.id || Math.random().toString(36).substr(2, 9),
        label: s.label,
        target_date: calculateAutoDate(r.recruiting_start_date, s.interval_days),
        is_achieved: false,
        is_missed: false
      }))
    }
    return m
  }

  const updateMilestone = (role: any, milestoneId: string, updates: any) => {
    const list = getMilestones(role)
    const updated = list.map((m: any) => m.id === milestoneId ? { ...m, ...updates } : m)
    handleUpdate(role.id, 'milestones_json', updated)
  }

  const addCustomMilestone = (role: any) => {
    const list = getMilestones(role)
    const updated = [...list, { id: Math.random().toString(36).substr(2, 9), label: 'New Milestone', target_date: '', is_achieved: false, is_missed: false }]
    handleUpdate(role.id, 'milestones_json', updated)
  }

  if (loading) return <div>Loading...</div>

  const activeRoles = roles.filter(r => r.status !== 'Archived')
  
  const today = new Date()
  today.setHours(0,0,0,0)
  
  const todayMs = today.getTime()
  const fiveDaysMs = todayMs + (5 * 24 * 60 * 60 * 1000)

  let overdueCount = 0
  let dueWithin5Count = 0
  
  let totalRoleDelayDays = 0
  let delayedRolesCount = 0

  let totalMilestoneDelayDays = 0
  let delayedMilestonesCount = 0

  const allUrgentMilestones: { roleName: string; clientName: string; milestoneName: string; daysLeft: number; isMissed: boolean }[] = []

  activeRoles.forEach(r => {
    // 1. Placement (Role) Calculation
    if (r.status !== 'Placed' && r.target_placement_date) {
      const target = new Date(r.target_placement_date)
      target.setHours(0,0,0,0)
      const diffMs = todayMs - target.getTime()
      
      if (diffMs > 0) {
        overdueCount++
        totalRoleDelayDays += Math.floor(diffMs / (1000 * 60 * 60 * 24))
        delayedRolesCount++
      } else if (diffMs <= 0 && diffMs >= -fiveDaysMs + todayMs) {
        // diffMs is between 0 and -5 days worth of ms, meaning it's due in <= 5 days
        // wait, earlier logic: tMs >= todayMs && tMs <= fiveDaysMs
        const tMs = target.getTime()
        if (tMs >= todayMs && tMs <= fiveDaysMs) dueWithin5Count++
      }
    }

    // 2. Milestone calculation
    if (Array.isArray(r.milestones_json)) {
      r.milestones_json.forEach((m: any) => {
         if (!m.is_achieved && m.target_date) {
            const mTarget = new Date(m.target_date)
            mTarget.setHours(0,0,0,0)
            const diffMs = mTarget.getTime() - todayMs
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
            
            if (daysLeft < 0) {
               totalMilestoneDelayDays += Math.abs(daysLeft)
               delayedMilestonesCount++
            }

            if (daysLeft <= 7) {
               allUrgentMilestones.push({
                 roleName: r.role || 'Unnamed Role',
                 clientName: r.order_leads?.contact_name || r.order_leads?.company_name || r.manual_client_name || 'No Client Assigned',
                 milestoneName: m.label,
                 daysLeft: daysLeft,
                 isMissed: !!m.is_missed
               })
            }
         }
      })
    }
  })

  allUrgentMilestones.sort((a,b) => a.daysLeft - b.daysLeft)
  const top3Urgent = allUrgentMilestones.slice(0, 3)

  const avgRoleDelay = delayedRolesCount > 0 ? Math.round(totalRoleDelayDays / delayedRolesCount) : 0
  const avgMilestoneDelay = delayedMilestonesCount > 0 ? Math.round(totalMilestoneDelayDays / delayedMilestonesCount) : 0

  return (
    <div className={styles.container}>
      {top3Urgent.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <div style={{ color: '#D97706', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚡</span> Urgent Action
          </div>
          <div style={{ width: 1, height: 24, background: '#FDE68A', margin: '0 4px' }} />
          {top3Urgent.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              {u.daysLeft < 0 ? (
                <span style={{ color: '#DC2626', fontWeight: 600, background: '#FEE2E2', padding: '2px 6px', borderRadius: 4 }}>{Math.abs(u.daysLeft)}d OVERDUE</span>
              ) : (
                <span style={{ color: '#D97706', fontWeight: 600, background: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>DUE IN {u.daysLeft}d</span>
              )}
              <span style={{ fontWeight: 600, color: '#111' }}>{u.roleName} ({u.clientName})</span>
              <span style={{ color: 'var(--text-muted)' }}>&rarr; {u.milestoneName}</span>
              {i < top3Urgent.length - 1 && <span style={{ margin: '0 8px', color: '#D1D5DB' }}>•</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, flex: 1, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Orders Overdue</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: overdueCount > 0 ? '#DC2626' : 'var(--text-primary)', marginTop: 4 }}>{overdueCount}</div>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, flex: 1, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Due in Next 5 Days</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: dueWithin5Count > 0 ? '#D97706' : 'var(--text-primary)', marginTop: 4 }}>{dueWithin5Count}</div>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, flex: 1, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Role Delay</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: avgRoleDelay > 0 ? '#DC2626' : 'var(--text-primary)' }}>{avgRoleDelay}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>days delay</span>
          </div>
        </div>
        <div style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, flex: 1, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Milestone Delay</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: avgMilestoneDelay > 0 ? '#DC2626' : 'var(--text-primary)' }}>{avgMilestoneDelay}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>days delay</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {activeRoles.map(r => {
          const currentMilestone = Array.isArray(r.milestones_json) ? r.milestones_json.find((m: any) => !m.is_achieved && !m.is_missed) : null
          const hasMissed = Array.isArray(r.milestones_json) && r.milestones_json.some((m: any) => m.is_missed)
          
          return (
            <div key={r.id} className={styles.miniCard} onClick={() => setActiveRoleModal(r.id)} style={hasMissed ? { borderColor: '#DC2626', background: 'rgba(220, 38, 38, 0.02)' } : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className={styles.miniRoleName}>{r.role || 'Unnamed Role'}</div>
                {hasMissed && <span style={{ fontSize: 10, background: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>MISSED</span>}
              </div>
              <div className={styles.miniCompanyName}>{r.order_leads?.contact_name || r.order_leads?.company_name || r.manual_client_name || 'No Client Assigned'}</div>
              {currentMilestone && (
                <div className={styles.miniNextMilestone}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                  Next: {currentMilestone.label}
                </div>
              )}
            </div>
          )
        })}
        
        {roles.length === 0 && (
          <div style={{ padding: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            No Active Roles trackable in Milestones. They automatically sync here when added to the Live Role Tracker.
          </div>
        )}
      </div>

      {activeRoleModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveRoleModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Role Details</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button 
                  style={{ background: 'none', border: '1px solid #DC2626', color: '#DC2626', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    if (confirm('Are you sure you want to archive this role?')) {
                      handleUpdate(activeRoleModal, 'status', 'Archived');
                      setActiveRoleModal(null);
                    }
                  }}
                >
                  Archive Role
                </button>
                <button className={styles.closeBtn} style={{ position: 'static' }} onClick={() => setActiveRoleModal(null)}>✕</button>
              </div>
            </div>
            <div className={styles.modalBody}>
              {(() => {
                const r = roles.find(ro => ro.id === activeRoleModal)
                if (!r) return null
                return (
                  <div className={styles.card} style={{ border: 'none', boxShadow: 'none' }}>
                    {/* Header Form */}
                    <div className={styles.header}>
                      <div className={styles.headerGroup}>
                        <span className={styles.headerLabel}>Recruiters</span>
                        <div style={{ position: 'relative' }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { const el = document.getElementById(`dropdown_rec_${r.id}`); if(el) el.style.display = 'none'; } }}>
                          <button type="button" className={styles.select} style={{ width: '100%', textAlign: 'left', minHeight: 40 }} onClick={() => {
                            const el = document.getElementById(`dropdown_rec_${r.id}`)
                            if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block'
                          }}>
                            {Array.isArray(r.recruiters_json) && r.recruiters_json.length > 0
                              ? recruiters.filter(rec => r.recruiters_json.includes(rec.id)).map(rec => rec.name).join(', ')
                              : 'Select recruiters...'}
                          </button>
                          <div id={`dropdown_rec_${r.id}`} style={{ display: 'none', position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, maxHeight: 150, overflowY: 'auto' }}>
                            {recruiters.map(rec => {
                              const selected = Array.isArray(r.recruiters_json) && r.recruiters_json.includes(rec.id)
                              return (
                                <label key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}>
                                  <input type="checkbox" checked={selected} onChange={() => {
                                    let next = Array.isArray(r.recruiters_json) ? [...r.recruiters_json] : []
                                    if (selected) next = next.filter(n => n !== rec.id)
                                    else next.push(rec.id)
                                    handleUpdate(r.id, 'recruiters_json', next)
                                  }} />
                                  {rec.name}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className={styles.headerGroup}>
                        <span className={styles.headerLabel}>Role</span>
                        <input 
                          className={styles.input}
                          value={r.role || ''}
                          onChange={(e) => handleUpdate(r.id, 'role', e.target.value)}
                          placeholder="Role Title"
                        />
                      </div>

                      <div className={styles.headerGroup}>
                        <span className={styles.headerLabel}>Company</span>
                        {leadSetupId === r.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input className={styles.input} id={`lead_name_${r.id}`} placeholder="Native Lead Name" />
                            <button className="btn btn-primary" style={{ padding: '0 10px', fontSize: 12 }} onClick={async () => {
                              const nm = (document.getElementById(`lead_name_${r.id}`) as HTMLInputElement).value
                              if(!nm) return
                              const res = await fetch('/api/leads', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ company_name: nm, current_stage: 'Screening' }) })
                              const d = await res.json()
                              if (d.id) { await handleUpdate(r.id, 'lead_id', d.id); setLeadSetupId(null); }
                            }}>Create</button>
                            <button className="btn btn-secondary" onClick={() => setLeadSetupId(null)}>✕</button>
                          </div>
                        ) : !r.lead_id && !r.manual_client_name ? (
                          <select 
                            className={styles.select}
                            value=""
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === 'manual_native') setLeadSetupId(r.id)
                              else if (val === 'manual') handleUpdate(r.id, 'manual_client_name', 'New Manual Client')
                              else handleUpdate(r.id, 'lead_id', val)
                            }}
                          >
                            <option value="">Select Lead...</option>
                            <option value="manual_native">-- Create Native Lead --</option>
                            <option value="manual">-- Setup Text-Only Client --</option>
                            {leads.map(l => (
                              <option key={l.id} value={l.id}>{l.contact_name || l.company_name}</option>
                            ))}
                          </select>
                        ) : r.lead_id ? (
                          <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                            <div style={{ flex: 1, padding: '6px 10px', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
                              {r.order_leads?.contact_name || r.order_leads?.company_name || 'Linked Lead'}
                            </div>
                            <button style={{marginLeft:8, fontSize:12, cursor:'pointer', border:'none', background:'none', color:'red'}} onClick={() => handleUpdate(r.id, 'lead_id', null)}>Change</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                            <input 
                              className={styles.input}
                              value={r.manual_client_name || ''}
                              onChange={(e) => handleUpdate(r.id, 'manual_client_name', e.target.value)}
                              placeholder="Client Name"
                            />
                            <button style={{marginLeft:8, fontSize:12, cursor:'pointer', border:'none', background:'none', color:'red'}} onClick={() => handleUpdate(r.id, 'manual_client_name', null)}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stages Matrix */}
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Recruitment Stage</th>
                            <th>Target Date</th>
                            <th style={{ width: 140 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Static Start Date */}
                          <tr>
                            <td><strong style={{color:'var(--text-primary)'}}>Start Date (Manual)</strong></td>
                            <td>
                              <input 
                                type="date"
                                className={styles.input}
                                value={r.recruiting_start_date || ''}
                                onChange={(e) => handleUpdate(r.id, 'recruiting_start_date', e.target.value)}
                                style={{ border: '1px solid var(--border)', padding: '5px 8px' }}
                              />
                            </td>
                            <td></td>
                          </tr>

                          {/* Dynamic Milestones */}
                          {getMilestones(r).map((stg: any) => {
                            const isPlacedRow = stg.label.toLowerCase().includes('placed')

                            return (
                              <tr key={stg.id} style={{ opacity: stg.is_achieved ? 0.7 : 1 }}>
                                <td style={{ textDecoration: stg.is_achieved ? 'line-through' : 'none' }}>
                                  <input 
                                    value={stg.label} 
                                    onChange={(e) => updateMilestone(r, stg.id, { label: e.target.value })} 
                                    style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', font: 'inherit' }}
                                  />
                                </td>
                                <td>
                                  {isPlacedRow && r.placed_on ? (
                                    <div className={styles.autoDate} style={{ background: 'rgba(78, 144, 237, 0.05)', color: 'var(--accent)', fontWeight: 600 }}>
                                      Placed on {r.placed_on}
                                    </div>
                                  ) : (
                                    <input 
                                      type="date"
                                      className={styles.input}
                                      title="Set Date"
                                      value={stg.target_date || ''}
                                      onChange={(e) => updateMilestone(r, stg.id, { target_date: e.target.value })}
                                      style={{ border: stg.target_date ? '1px solid var(--accent)' : '1px solid var(--border)', background: stg.target_date ? 'transparent' : 'var(--bg-secondary)', padding: '5px 8px' }}
                                    />
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button 
                                      style={{ flex: 1, padding: '4px 0', border: '1px solid', borderRadius: 4, cursor: 'pointer', background: stg.is_achieved ? '#059669' : 'transparent', color: stg.is_achieved ? '#fff' : '#059669', borderColor: '#059669', fontSize: 11, fontWeight: 600 }}
                                      onClick={() => updateMilestone(r, stg.id, { is_achieved: !stg.is_achieved, is_missed: false })}
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      style={{ flex: 1, padding: '4px 0', border: '1px solid', borderRadius: 4, cursor: 'pointer', background: stg.is_missed ? '#DC2626' : 'transparent', color: stg.is_missed ? '#fff' : '#DC2626', borderColor: '#DC2626', fontSize: 11, fontWeight: 600 }}
                                      onClick={() => updateMilestone(r, stg.id, { is_missed: !stg.is_missed, is_achieved: false })}
                                    >
                                      ✗
                                    </button>
                                    <button 
                                      style={{ padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-muted)' }}
                                      title="Delete Milestone"
                                      onClick={() => {
                                        const list = getMilestones(r).filter((m: any) => m.id !== stg.id)
                                        handleUpdate(r.id, 'milestones_json', list)
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '12px 10px' }}>
                              <button onClick={() => addCustomMilestone(r)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                + Add Custom Milestone
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Completion & Summaries Footer */}
                    <div className={styles.footer}>
                      <div className={styles.footerBox}>
                        <label>Completion Date</label>
                        <input 
                          type="date"
                          className={styles.input}
                          value={r.recruitment_completion_date || ''}
                          onChange={(e) => handleUpdate(r.id, 'recruitment_completion_date', e.target.value)}
                        />
                      </div>
                      <div className={styles.footerBox}>
                        <label>Total Started by Date</label>
                        <input 
                          type="number"
                          className={styles.input}
                          value={r.total_started ?? 0}
                          onChange={(e) => handleUpdate(r.id, 'total_started', parseInt(e.target.value))}
                        />
                      </div>
                      <div className={styles.footerBox} style={{ gridColumn: 'span 2' }}>
                        <label>Total Completed by Date</label>
                        <input 
                          type="number"
                          className={styles.input}
                          value={r.total_completed ?? 0}
                          onChange={(e) => handleUpdate(r.id, 'total_completed', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
