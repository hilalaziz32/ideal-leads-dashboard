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

  if (loading) return <div>Loading...</div>

  return (
    <div className={styles.container}>
      <h2 style={{ margin: '0 0 24px 0', fontWeight: 600 }}>Live Milestones</h2>

      <div className={styles.grid}>
        {roles.map(r => (
          <div key={r.id} className={styles.card}>
            
            {/* Header Form */}
            <div className={styles.header}>
              <div className={styles.headerGroup}>
                <span className={styles.headerLabel}>Recruiter</span>
                <select 
                  className={styles.select}
                  value={r.recruiter_id || ''}
                  onChange={(e) => handleUpdate(r.id, 'recruiter_id', e.target.value)}
                >
                  <option value="">Select Recruiter...</option>
                  {recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}
                </select>
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
                {!r.lead_id && !r.manual_client_name ? (
                  <select 
                    className={styles.select}
                    value={r.lead_id || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'manual') {
                        handleUpdate(r.id, 'manual_client_name', 'New Client')
                      } else {
                        handleUpdate(r.id, 'lead_id', val)
                      }
                    }}
                  >
                    <option value="">Select Lead...</option>
                    <option value="manual">-- Setup Manual Client --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.contact_name || l.company_name}</option>
                    ))}
                  </select>
                ) : r.lead_id ? (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                    <div style={{ flex: 1, padding: '6px 10px', fontSize: 13, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
                      {r.order_leads?.contact_name || 'Linked Lead'}
                    </div>
                    <button style={{marginLeft:8, fontSize:12, cursor:'pointer', border:'none', background:'none', color:'red'}} onClick={() => handleUpdate(r.id, 'lead_id', null)}>Change</button>
                  </div>
                ) : (
                  <input 
                    className={styles.input}
                    value={r.manual_client_name || ''}
                    onChange={(e) => handleUpdate(r.id, 'manual_client_name', e.target.value)}
                    placeholder="Client Name"
                  />
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
                        style={{ border: '1px solid var(--border)' }}
                      />
                    </td>
                  </tr>

                  {/* Auto Calculated M1-M3 and override Placed */}
                  {recStages.filter(s => s.label !== 'Recruiting').map(stg => {
                    const isPlacedRow = stg.label.toLowerCase().includes('placed')
                    const autoDateStr = calculateAutoDate(r.recruiting_start_date, stg.interval_days)

                    return (
                      <tr key={stg.id}>
                        <td>{stg.label}</td>
                        <td>
                          {isPlacedRow ? (
                            <input 
                              type="date"
                              className={styles.input}
                              title="Override Date"
                              value={r.placed_on || autoDateStr || ''}
                              onChange={(e) => handleUpdate(r.id, 'placed_on', e.target.value)}
                              style={{ border: r.placed_on ? '1px solid var(--accent)' : '1px solid var(--border)', background: r.placed_on ? 'rgba(78, 144, 237, 0.05)' : '' }}
                            />
                          ) : (
                            <div className={styles.autoDate}>
                              {autoDateStr ? autoDateStr : 'Awaiting Start Date'}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
        ))}
        
        {roles.length === 0 && (
          <div style={{ padding: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            No Active Roles trackable in Milestones. They automatically sync here when added to the Live Role Tracker.
          </div>
        )}
      </div>
    </div>
  )
}
