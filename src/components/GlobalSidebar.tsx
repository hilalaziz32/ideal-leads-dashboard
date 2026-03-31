'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './global-sidebar.module.css'
import { LeadWithOverdue } from '@/lib/types'

export default function GlobalSidebar() {
  const [leads, setLeads] = useState<LeadWithOverdue[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data)
      })
      .catch(() => {})
  }, [])

  const filtered = leads.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.contact_name?.toLowerCase().includes(q) ||
      l.contact_email?.toLowerCase().includes(q) ||
      l.executive?.toLowerCase().includes(q)
    )
  })

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.title}>All Leads</div>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={styles.list}>
        {filtered.map((lead) => (
          <Link href={`/leads/${lead.id}`} key={lead.id} className={styles.leadItem}>
            <div className={styles.leadName}>{lead.contact_name || 'No Name'}</div>
            <div className={styles.leadMeta}>
              <span>{new Date(lead.created_at).toLocaleDateString()}</span>
              <span className={styles.stageBadge}>{lead.stage_label}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            No leads found.
          </div>
        )}
      </div>
    </aside>
  )
}
