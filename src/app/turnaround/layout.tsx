'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './turnaround.module.css'

export default function TurnaroundLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 0 }}>
        <h1 className={styles.title} style={{ margin: 0, fontSize: 22 }}>Order Turnaround</h1>
        <nav className={styles.navTabs} style={{ borderBottom: 'none', marginBottom: 0 }}>
          <Link href="/turnaround/live-milestones" className={`${styles.navLink} ${pathname === '/turnaround/live-milestones' ? styles.navLinkActive : ''}`}>Live Milestones</Link>
          <Link href="/turnaround/live-tracker" className={`${styles.navLink} ${pathname === '/turnaround/live-tracker' ? styles.navLinkActive : ''}`}>Live Role Tracker</Link>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
