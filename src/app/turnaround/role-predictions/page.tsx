'use client'

import { useEffect, useState } from 'react'
import styles from './predictions.module.css'

export default function RolePredictions() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [trackerRoles, setTrackerRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [predRes, rolesRes] = await Promise.all([
        fetch('/api/turnaround/predictions').then(r => r.json()),
        fetch('/api/turnaround/roles').then(r => r.json())
      ])

      setPredictions(Array.isArray(predRes) ? predRes : [])
      setTrackerRoles(Array.isArray(rolesRes) ? rolesRes : [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRow = async () => {
    try {
      const res = await fetch('/api/turnaround/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ })
      })
      const newRow = await res.json()
      setPredictions([newRow, ...predictions])
    } catch(err) {
      console.error(err)
    }
  }

  const handleUpdate = async (id: string, field: string, value: any) => {
    setPredictions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    try {
      await fetch(`/api/turnaround/predictions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      if (field === 'tracker_role_id') {
        fetchData() // Refresh to grab joined tables if FK changed
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm('Delete this prediction row?')) return
    setPredictions(prev => prev.filter(p => p.id !== id))
    try {
      await fetch(`/api/turnaround/predictions/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error(err)
    }
  }

  const calculateDuration = (start: string | null, projected: string | null) => {
    if (!start || !projected) return null
    const s = new Date(start)
    const p = new Date(projected)
    if (isNaN(s.getTime()) || isNaN(p.getTime())) return null
    s.setHours(0,0,0,0)
    p.setHours(0,0,0,0)
    const diff = p.getTime() - s.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>Current Role Predictions</h2>
        <button onClick={handleAddRow} className={styles.actionButton}>+ Add Prediction</button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Link to Live Role (Optional)</th>
              <th>Role / Title</th>
              <th>Start Date</th>
              <th>Predicted Placement Date</th>
              <th>Total Duration to Fill</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {predictions.map(p => {
              const isLinked = !!p.tracker_role_id
              
              // Resolve active details
              const resolvedRoleName = isLinked 
                ? p.order_turnaround_roles?.role 
                : p.manual_role_name

              const resolvedStartDate = isLinked
                ? (p.order_turnaround_roles?.start_date || p.order_turnaround_roles?.order_leads?.created_at?.split('T')[0])
                : p.manual_start_date

              const duration = calculateDuration(resolvedStartDate, p.predicted_placement_date)

              return (
                <tr key={p.id}>
                  {/* Linkage Column */}
                  <td style={{ minWidth: 250 }}>
                    <select 
                      className={styles.select}
                      value={p.tracker_role_id || ''}
                      onChange={(e) => handleUpdate(p.id, 'tracker_role_id', e.target.value)}
                    >
                      <option value="">-- Standalone Prediction --</option>
                      {trackerRoles.map(tr => (
                        <option key={tr.id} value={tr.id}>
                          {tr.role || 'Unnamed Role'} (ID: {tr.id.substring(0,4)})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Role Column */}
                  <td>
                    {isLinked ? (
                      <div className={styles.linkedValue}>🔗 {resolvedRoleName || 'Unlabeled Live Role'}</div>
                    ) : (
                      <input 
                        className={styles.input}
                        placeholder="Manual Role Name"
                        value={p.manual_role_name || ''}
                        onChange={(e) => handleUpdate(p.id, 'manual_role_name', e.target.value)}
                      />
                    )}
                  </td>

                  {/* Start Date Column */}
                  <td>
                    {isLinked ? (
                      <div className={styles.linkedValue}>🔗 {resolvedStartDate || 'No Start Date set in Tracker'}</div>
                    ) : (
                      <input 
                        type="date"
                        className={styles.input}
                        value={p.manual_start_date || ''}
                        onChange={(e) => handleUpdate(p.id, 'manual_start_date', e.target.value)}
                      />
                    )}
                  </td>

                  {/* Predicted Placement Date */}
                  <td>
                    <input 
                      type="date"
                      className={styles.input}
                      value={p.predicted_placement_date || ''}
                      onChange={(e) => handleUpdate(p.id, 'predicted_placement_date', e.target.value)}
                      style={{ border: '1px solid var(--border)' }}
                    />
                  </td>

                  {/* Computed Metric */}
                  <td>
                    {duration !== null ? (
                      <span className={styles.durationStamp}>{duration} Days</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>

                  <td>
                    <button onClick={() => handleDelete(p.id)} className={styles.deleteBtn}>&times;</button>
                  </td>
                </tr>
              )
            })}

            {predictions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No role predictions tracking currently. Click "+ Add Prediction" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
