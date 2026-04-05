'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './tracker.module.css'

export default function LiveRoleTracker() {
  const [roles, setRoles] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [recStages, setRecStages] = useState<any[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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
      stageConfigRes.data?.forEach(s => stg.add(s.label))
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

  const handleAddCustomStage = async () => {
    const stage = prompt("Enter new custom pipeline stage:")
    if (!stage) return
    await fetch('/api/turnaround/stages', { method: 'POST', body: JSON.stringify({ label: stage })})
    fetchData()
  }

  const handleAddCustomRecStage = async () => {
    const stage = prompt("Enter new custom recruitment stage:")
    if (!stage) return
    await fetch('/api/turnaround/recruitment-stages', { method: 'POST', body: JSON.stringify({ label: stage })})
    fetchData()
  }

  const handleAddCustomStatus = async () => {
    const status = prompt("Enter new custom status:")
    if (!status) return
    await fetch('/api/turnaround/statuses', { method: 'POST', body: JSON.stringify({ label: status })})
    fetchData()
  }

  const calculateDays = (target: string | null) => {
    if (!target) return null
    const targetDate = new Date(target)
    if (isNaN(targetDate.getTime())) return null
    const today = new Date()
    // Reset times to compare just days
    targetDate.setHours(0,0,0,0)
    today.setHours(0,0,0,0)
    
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) return <div>Loading...</div>

  const totalActive = roles.filter(r => r.status === 'Active').length
  const totalPlaced = roles.filter(r => r.status === 'Placed').length
  const totalOverdue = roles.filter(r => {
    const days = calculateDays(r.target_placement_date)
    return days !== null && days < 0 && r.status !== 'Placed'
  }).length

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>Live Tracker</h2>
        <button onClick={handleAddRow} className={styles.actionButton}>+ Add Row</button>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Current Active Roles</div>
          <div className={styles.kpiValue}>{totalActive}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Placed</div>
          <div className={`${styles.kpiValue} ${styles.kpiSuccess}`}>{totalPlaced}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Overdue Targets</div>
          <div className={totalOverdue > 0 ? `${styles.kpiValue} ${styles.kpiAlert}` : styles.kpiValue}>{totalOverdue}</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Client / Lead Name</th>
              <th>Role</th>
              <th>Start Date</th>
              <th>Pipeline Stage <span style={{cursor:'pointer', color:'var(--accent)', marginLeft: 8}} onClick={handleAddCustomStage}>+</span></th>
              <th>Recruitment Stage <span style={{cursor:'pointer', color:'var(--accent)', marginLeft: 8}} onClick={handleAddCustomRecStage}>+</span></th>
              <th>Target Placement</th>
              <th>Days to Placement</th>
              <th>Placed On</th>
              <th>Recruiter</th>
              <th>Placed By</th>
              <th>Status <span style={{cursor:'pointer', color:'var(--accent)', marginLeft: 8}} onClick={handleAddCustomStatus}>+</span></th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => {
              const daysToPlacement = calculateDays(r.target_placement_date)
              
              const isSurplus = daysToPlacement !== null && daysToPlacement >= 0
              const isDeficit = daysToPlacement !== null && daysToPlacement < 0

              return (
                <tr key={r.id} className={isDeficit && r.status !== 'Placed' ? styles.rowAlert : ''}>
                  {/* Name column mixing select and manual input */}
                  <td style={{ minWidth: 250 }}>
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
                      <div style={{ padding: '8px 12px', fontWeight: 500 }}>
                        {r.order_leads?.contact_name || 'Linked Lead'}
                        <button style={{marginLeft:8, fontSize:10, cursor:'pointer', border:'none', background:'none', color:'red'}} onClick={() => handleUpdate(r.id, 'lead_id', null)}>x</button>
                      </div>
                    ) : (
                      <input 
                        className={styles.input}
                        value={r.manual_client_name || ''}
                        onChange={(e) => handleUpdate(r.id, 'manual_client_name', e.target.value)}
                        placeholder="Client Name"
                      />
                    )}
                  </td>

                  <td>
                    <input 
                      className={styles.input}
                      value={r.role || ''}
                      onChange={(e) => handleUpdate(r.id, 'role', e.target.value)}
                      placeholder="Role Title"
                      style={{ minWidth: 150 }}
                    />
                  </td>

                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={r.start_date || r.order_leads?.created_at?.split('T')[0] || ''}
                      onChange={(e) => handleUpdate(r.id, 'start_date', e.target.value)}
                    />
                  </td>

                  <td>
                    <select 
                      className={styles.select}
                      value={r.pipeline_stage || ''}
                      onChange={(e) => handleUpdate(r.id, 'pipeline_stage', e.target.value)}
                    >
                      <option value="">Select Pipeline...</option>
                      {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>

                  <td>
                    <select 
                      className={styles.select}
                      value={r.recruitment_stage || ''}
                      onChange={(e) => handleUpdate(r.id, 'recruitment_stage', e.target.value)}
                    >
                      <option value="">Select Recruitment...</option>
                      {recStages.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
                    </select>
                  </td>

                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={r.target_placement_date || ''}
                      onChange={(e) => handleUpdate(r.id, 'target_placement_date', e.target.value)}
                    />
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {daysToPlacement !== null ? (
                      <span className={isSurplus ? styles.surplus : styles.deficit}>
                        {isDeficit && r.status !== 'Placed' && <span style={{marginRight: 4}}>🚨</span>}
                        {daysToPlacement > 0 ? `+${daysToPlacement}` : daysToPlacement}
                      </span>
                    ) : '-'}
                  </td>

                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={r.placed_on || ''}
                      onChange={(e) => handleUpdate(r.id, 'placed_on', e.target.value)}
                    />
                  </td>

                  <td>
                    <select 
                      className={styles.select}
                      value={r.recruiter_id || ''}
                      onChange={(e) => handleUpdate(r.id, 'recruiter_id', e.target.value)}
                    >
                      <option value="">Select Recruiter...</option>
                      {recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}
                    </select>
                  </td>

                  <td>
                    <input 
                      className={styles.input}
                      value={r.placed_by || ''}
                      onChange={(e) => handleUpdate(r.id, 'placed_by', e.target.value)}
                      placeholder="Placed By"
                    />
                  </td>

                  <td>
                    <select 
                      className={styles.select}
                      value={r.status || ''}
                      onChange={(e) => handleUpdate(r.id, 'status', e.target.value)}
                      style={{ fontWeight: 600, color: r.status === 'Active' ? '#0b823b' : r.status === 'Placed' ? 'var(--accent)' : 'inherit' }}
                    >
                      <option value="">Status...</option>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>

                </tr>
              )
            })}
            
            {roles.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className={styles.emptyState}>
                    No active roles tracked. Click "+ Add Row" to begin.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
