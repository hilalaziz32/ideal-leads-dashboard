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
    return 'gray'
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" />Loading Data...</div>

  const totalActive = roles.filter(r => r.status === 'Active').length
  const totalPlaced = roles.filter(r => r.status === 'Placed').length
  const totalOverdue = roles.filter(r => {
    const days = calculateDays(r.target_placement_date)
    return days !== null && days < 0 && r.status !== 'Placed'
  }).length

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#111' }}>Trackers</h2>
        <button onClick={handleAddRow} className={styles.actionButton}>+ Add Role</button>
      </div>

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
            {roles.map(r => {
              const daysToPlacement = calculateDays(r.target_placement_date)
              const isOverdue = daysToPlacement !== null && daysToPlacement < 0 && r.status !== 'Placed'

              return (
                <tr key={r.id}>
                  {/* Client Name Cell */}
                  <td>
                    {!r.lead_id && !r.manual_client_name ? (
                      <select 
                        className={styles.select}
                        value=""
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'manual') handleUpdate(r.id, 'manual_client_name', 'New Client')
                          else handleUpdate(r.id, 'lead_id', val)
                        }}
                      >
                        <option value="">Select Lead...</option>
                        <option value="manual">-- Setup Manual Client --</option>
                        {leads.map(l => (
                          <option key={l.id} value={l.id}>{l.contact_name || l.company_name}</option>
                        ))}
                      </select>
                    ) : r.lead_id ? (
                      <div className={styles.badgeCell} style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{r.order_leads?.contact_name || 'Linked Lead'}</span>
                        <button style={{ fontSize: 10, cursor: 'pointer', border: 'none', background: 'none', color: '#999' }} onClick={() => handleUpdate(r.id, 'lead_id', null)}>✕</button>
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

                  {/* Recruitment Stage */}
                  <td>
                    <select 
                      className={styles.select}
                      value={r.recruitment_stage || ''}
                      onChange={(e) => handleUpdate(r.id, 'recruitment_stage', e.target.value)}
                    >
                      <option value="">Select...</option>
                      {recStages.map((s: any) => <option key={s.id} value={s.label}>{s.label}</option>)}
                    </select>
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
                    <select 
                      className={styles.select}
                      value={r.recruiter_id || ''}
                      onChange={(e) => handleUpdate(r.id, 'recruiter_id', e.target.value)}
                    >
                      <option value="">Select Recruiter...</option>
                      {recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}
                    </select>
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
