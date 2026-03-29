'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useParams } from 'next/navigation'
import styles from './lead-layout.module.css'

const NAV_ITEMS = [
  { href: '', label: 'Overview', icon: '◎', desc: 'Lead info & timeline' },
  { href: '/checklist', label: 'Checklist & Advance', icon: '✓', desc: 'Stage progress' },
  { href: '/questions', label: 'Intake Questions', icon: '📋', desc: 'HELM Q&A form' },
  { href: '/due-date', label: 'Due Date', icon: '📅', desc: 'Set stage deadline' },
]

export default function LeadLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.backHome}>← All Leads</Link>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const href = `/leads/${id}${item.href}`
            const isActive = item.href === ''
              ? pathname === href
              : pathname.startsWith(href)

            return (
              <Link
                key={item.href}
                href={href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navText}>
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.navDesc}>{item.desc}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerLabel}>Lead ID</div>
          <div className={styles.footerId}>{id?.slice(0, 8)}…</div>
        </div>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}
