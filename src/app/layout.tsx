import type { Metadata } from 'next'
import GlobalSidebar from '@/components/GlobalSidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ideal Leads Dashboard',
  description: 'Pipeline management for ideal leads — track stages, checklists, votes and more.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <a href="/" className="nav-brand">
              ⚡ Ideal<span>Leads</span>
            </a>
            <a href="/" className="nav-link">Dashboard</a>
          </div>
        </nav>
        <div className="app-container">
          <GlobalSidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  )
}
