'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './global-sidebar.module.css'

export default function GlobalSidebar() {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.title}>Main Menu</div>
      </div>
      <div className={styles.list}>
        <Link 
          href="/" 
          className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
        >
          <span className={styles.icon}>📊</span>
          Metrics Dashboard
        </Link>
        <Link 
          href="/leads" 
          className={`${styles.navItem} ${(pathname === '/leads' || pathname.startsWith('/leads/')) ? styles.navItemActive : ''}`}
        >
          <span className={styles.icon}>👥</span>
          Leads Pipeline
        </Link>
      </div>
    </aside>
  )
}
