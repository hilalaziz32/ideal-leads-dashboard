'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './turnaround.module.css'

export default function TurnaroundLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Order Turnaround</h1>
        <nav className={styles.navTabs}>
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
