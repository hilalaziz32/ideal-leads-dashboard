'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './campaigns.module.css'

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>HELM — RF Daily Sourcing Tracker</h1>
        <nav className={styles.navTabs}>
          <Link 
            href="/campaigns/upwork" 
            className={`${styles.navLink} ${pathname === '/campaigns/upwork' ? styles.navLinkActive : ''}`}
          >
            Upwork
          </Link>
          <Link 
            href="/campaigns/live" 
            className={`${styles.navLink} ${pathname === '/campaigns/live' ? styles.navLinkActive : ''}`}
          >
            Live Campaign Tracker
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
