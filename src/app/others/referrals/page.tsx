'use client'

import { useEffect, useState } from 'react'
import styles from './referrals.module.css'

interface ReferralPartner {
  id: string
  name: string
  points: number
  created_at: string
}

export default function ReferralsPage() {
  const [partners, setPartners] = useState<ReferralPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/referrals')
      const data = await res.json()
      if (Array.isArray(data)) {
        setPartners(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPartners()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      if (res.ok) {
        setNewName('')
        fetchPartners() // Refresh list to get the new partner with 0 points
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading partners...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Referral Program</h1>
          <div className={styles.subtitle}>Manage your referral partners and track their active lead points.</div>
        </div>
      </div>

      <form className={styles.addBox} onSubmit={handleAdd}>
        <input 
          type="text" 
          placeholder="Add a Referral Guy (e.g., Jane Smith - Hairdresser)..." 
          className={styles.input} 
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={submitting || !newName.trim()}>
          {submitting ? 'Adding...' : 'Add Partner'}
        </button>
      </form>

      {partners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
           <h3 style={{ color: 'var(--text-muted)' }}>No referral partners yet.</h3>
        </div>
      ) : (
        <div className={styles.grid}>
          {partners.map(p => (
            <div key={p.id} className={styles.card}>
              <div className={styles.avatar}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <h3 className={styles.partnerName}>{p.name}</h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Joined {new Date(p.created_at).toLocaleDateString()}</div>
              
              <div className={`${styles.pointsBadge} ${p.points === 0 ? styles.pointsZero : ''}`}>
                ★ {p.points} Points
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
