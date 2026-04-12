'use client'

import React from 'react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import styles from './stat-card.module.css'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  trend?: { date: string; value: number }[]
  icon?: React.ReactNode
  loading?: boolean
}

export default function StatCard({ title, value, change, trend, icon, loading }: StatCardProps) {
  if (loading) {
    return <div className={`${styles.card} ${styles.skeleton}`} />
  }

  const isPositive = (change || 0) >= 0

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          {icon && <div className={styles.icon}>{icon}</div>}
        </div>
        <div className={styles.valueGroup}>
          <h2 className={styles.value}>{value}</h2>
          {change !== undefined && (
            <span className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>

      {trend && trend.length > 0 && (
        <div className={styles.chartContainer} style={{ width: '100%', height: 60, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? 'var(--success)' : 'var(--danger)'} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={isPositive ? 'var(--success)' : 'var(--danger)'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? 'var(--success)' : 'var(--danger)'}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad-${title})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
