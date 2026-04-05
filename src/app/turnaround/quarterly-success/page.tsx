'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './quarterly.module.css'

export default function QuarterlySuccess() {
  const [roles, setRoles] = useState<any[]>([])
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rolesRes, recRes] = await Promise.all([
        fetch('/api/turnaround/roles').then(r => r.json()),
        supabase.from('referral_partners').select('*')
      ])

      setRoles(Array.isArray(rolesRes) ? rolesRes : [])
      setRecruiters(recRes.data || [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
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
    } catch (err) {
      console.error(err)
    }
  }

  const calculateAutoDate = (baseDate: string | null, daysToAdd: number) => {
    if (!baseDate) return null
    const d = new Date(baseDate)
    if (isNaN(d.getTime())) return null
    d.setUTCDate(d.getUTCDate() + daysToAdd)
    return d.toISOString().split('T')[0]
  }

  const getQuarter = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const month = d.getUTCMonth()
    if (month <= 2) return 'Q1'
    if (month <= 5) return 'Q2'
    if (month <= 8) return 'Q3'
    return 'Q4'
  }

  const getRecruiterName = (id: string | null) => {
    if (!id) return '-'
    const rec = recruiters.find(r => r.id === id)
    return rec ? rec.name : 'Unknown'
  }

  const getChipClass = (val: string | null) => {
    if (val === 'Achieved') return styles.statusAchieved
    if (val === 'Missed') return styles.statusMissed
    return styles.statusNone
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className={styles.container}>
      <h2 style={{ margin: '0 0 24px 0', fontWeight: 600 }}>Quarterly Success</h2>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Quarter</th>
              <th>Recruiter</th>
              <th>Role</th>
              <th>Start Date</th>
              <th>M1 <span style={{fontWeight:400, opacity:0.7, fontSize:11}}>(+7)</span></th>
              <th>M2 <span style={{fontWeight:400, opacity:0.7, fontSize:11}}>(+14)</span></th>
              <th>M3 <span style={{fontWeight:400, opacity:0.7, fontSize:11}}>(+18)</span></th>
              <th>M4 Placed <span style={{fontWeight:400, opacity:0.7, fontSize:11}}>(+21)</span></th>
              <th>M5 Check-in <span style={{fontWeight:400, opacity:0.7, fontSize:11}}>(+30 p)</span></th>
              <th>Active Due Date</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => {
              // Mathematical projections from milestones
              const start = r.recruiting_start_date
              const autoM1 = calculateAutoDate(start, 7)
              const autoM2 = calculateAutoDate(start, 14)
              const autoM3 = calculateAutoDate(start, 18)
              const autoM4 = r.placed_on || calculateAutoDate(start, 21) // Uses explicit placement if available
              const autoM5 = calculateAutoDate(r.placed_on || autoM4, 30) 

              // Logic to evaluate which milestone is currently active
              let activeStageLabel = 'N/A'
              let activeStageDate = '-'

              if (!start) {
                activeStageLabel = 'Awaiting Start Date'
              } else if (!r.m1_status) {
                activeStageLabel = 'M1 Due'
                activeStageDate = autoM1 || '-'
              } else if (!r.m2_status) {
                activeStageLabel = 'M2 Due'
                activeStageDate = autoM2 || '-'
              } else if (!r.m3_status) {
                activeStageLabel = 'M3 Due'
                activeStageDate = autoM3 || '-'
              } else if (!r.m4_status) {
                activeStageLabel = 'M4 Due'
                activeStageDate = autoM4 || '-'
              } else if (!r.m5_status) {
                activeStageLabel = 'M5 Due'
                activeStageDate = autoM5 || '-'
              } else {
                activeStageLabel = 'Fully Evaluated'
              }

              return (
                <tr key={r.id}>
                  {/* Quarter (Auto vs Override) */}
                  <td style={{ minWidth: 100 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select 
                        style={{ padding: '6px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent' }}
                        value={r.quarter_override || ''}
                        onChange={(e) => handleUpdate(r.id, 'quarter_override', e.target.value)}
                      >
                        <option value="">Auto ({getQuarter(start)})</option>
                        <option value="1">Q1</option>
                        <option value="2">Q2</option>
                        <option value="3">Q3</option>
                        <option value="4">Q4</option>
                      </select>
                    </div>
                  </td>

                  <td><strong>{getRecruiterName(r.recruiter_id)}</strong></td>
                  <td>{r.role || '-'}</td>
                  
                  <td>{start || '-'}</td>

                  {/* M1 - M5 Selectors */}
                  <td>
                    <select 
                      className={`${styles.selectChip} ${getChipClass(r.m1_status)}`}
                      value={r.m1_status || ''}
                      onChange={(e) => handleUpdate(r.id, 'm1_status', e.target.value)}
                    >
                      <option value="">Pending...</option>
                      <option value="Achieved">Achieved</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className={`${styles.selectChip} ${getChipClass(r.m2_status)}`}
                      value={r.m2_status || ''}
                      onChange={(e) => handleUpdate(r.id, 'm2_status', e.target.value)}
                    >
                      <option value="">Pending...</option>
                      <option value="Achieved">Achieved</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className={`${styles.selectChip} ${getChipClass(r.m3_status)}`}
                      value={r.m3_status || ''}
                      onChange={(e) => handleUpdate(r.id, 'm3_status', e.target.value)}
                    >
                      <option value="">Pending...</option>
                      <option value="Achieved">Achieved</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className={`${styles.selectChip} ${getChipClass(r.m4_status)}`}
                      value={r.m4_status || ''}
                      onChange={(e) => handleUpdate(r.id, 'm4_status', e.target.value)}
                    >
                      <option value="">Pending...</option>
                      <option value="Achieved">Achieved</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className={`${styles.selectChip} ${getChipClass(r.m5_status)}`}
                      value={r.m5_status || ''}
                      onChange={(e) => handleUpdate(r.id, 'm5_status', e.target.value)}
                    >
                      <option value="">Pending...</option>
                      <option value="Achieved">Achieved</option>
                      <option value="Missed">Missed</option>
                    </select>
                  </td>

                  {/* Active Due Date */}
                  <td style={{minWidth: 160}}>
                    {activeStageLabel === 'Fully Evaluated' ? (
                      <span className={styles.dueDateComplete}>✓ Complete</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                          {activeStageLabel}
                        </span>
                        {activeStageDate !== '-' ? (
                          <span className={styles.dueDateActive}>{activeStageDate}</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}

            {roles.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No roles available to evaluate for Quarterly Success yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
