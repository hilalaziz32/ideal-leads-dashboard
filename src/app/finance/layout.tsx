'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './finance.module.css'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Finance Dashboard</h1>
        <nav className={styles.navTabs}>
          <Link 
            href="/finance/mrr-granular" 
            className={`${styles.navLink} ${pathname === '/finance/mrr-granular' ? styles.navLinkActive : ''}`}
          >
            MRR Granular View
          </Link>
          <Link 
            href="/finance/mrr-assumptions" 
            className={`${styles.navLink} ${pathname === '/finance/mrr-assumptions' ? styles.navLinkActive : ''}`}
          >
            MRR Assumptions
          </Link>
          <Link 
            href="/finance/sales-kpi" 
            className={`${styles.navLink} ${pathname === '/finance/sales-kpi' ? styles.navLinkActive : ''}`}
          >
            Sales / Recruiting KPIs
          </Link>
          <Link 
            href="/finance/dynamic-kpi" 
            className={`${styles.navLink} ${pathname === '/finance/dynamic-kpi' ? styles.navLinkActive : ''}`}
          >
            Dynamic KPI Tracker
          </Link>
          <Link 
            href="/finance/finance-kpi" 
            className={`${styles.navLink} ${pathname === '/finance/finance-kpi' ? styles.navLinkActive : ''}`}
          >
            Finance KPIs
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
