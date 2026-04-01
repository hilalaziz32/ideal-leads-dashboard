'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './global-sidebar.module.css'

export default function GlobalSidebar() {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.title}>Menu</div>
      <div className={styles.list}>
        <Link 
          href="/" 
          className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          Metrics
        </Link>
        <Link 
          href="/leads" 
          className={`${styles.navItem} ${(pathname === '/leads' || pathname.startsWith('/leads/')) ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Pipeline
        </Link>
      </div>

      <div className={styles.title} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>Others</div>
      <div className={styles.list}>
        <Link 
          href="/others/referrals" 
          className={`${styles.navItem} ${pathname.startsWith('/others/referrals') ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <polyline points="16 11 18 13 22 9" />
          </svg>
          Referral Program
        </Link>
      </div>
    </aside>
  )
}
