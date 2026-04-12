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
        
        <Link 
          href="/turnaround" 
          className={`${styles.navItem} ${pathname.startsWith('/turnaround') ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Order Turnaround
        </Link>
        
        <Link 
          href="/campaigns" 
          className={`${styles.navItem} ${pathname.startsWith('/campaigns') ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Campaign Tracker
        </Link>
        
        <Link 
          href="/finance" 
          className={`${styles.navItem} ${pathname.startsWith('/finance') ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          Finance Dashboard
        </Link>
        
        <Link 
          href="/meetings" 
          className={`${styles.navItem} ${pathname.startsWith('/meetings') ? styles.navItemActive : ''}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Meeting Tracker
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
