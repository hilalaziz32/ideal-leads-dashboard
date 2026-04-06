'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './finance.module.css'

const TABS = [
  { href: '/finance/mrr-granular',   label: 'MRR Granular' },
  { href: '/finance/mrr-assumptions', label: 'MRR Assumptions' },
  { href: '/finance/sales-kpi',       label: 'Sales / Recruiting' },
  { href: '/finance/dynamic-kpi',     label: 'Dynamic KPI' },
  { href: '/finance/finance-kpi',     label: 'Finance KPIs' },
]

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.title}>Finance</span>
        <nav className={styles.navTabs}>
          {TABS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className={`${styles.navLink} ${pathname === t.href ? styles.navLinkActive : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
