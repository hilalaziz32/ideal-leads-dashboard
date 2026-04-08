'use client'

import React from 'react'

interface AirtableBadgeProps {
  label: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  style?: React.CSSProperties
}

const colorMap = {
  blue: { bg: 'rgba(45, 127, 249, 0.15)', text: '#0052cc' },
  green: { bg: 'rgba(5, 150, 105, 0.15)', text: '#065f46' },
  red: { bg: 'rgba(220, 38, 38, 0.15)', text: '#991b1b' },
  yellow: { bg: 'rgba(217, 119, 6, 0.15)', text: '#92400e' },
  purple: { bg: 'rgba(124, 58, 237, 0.15)', text: '#5b21b6' },
  gray: { bg: 'rgba(107, 114, 128, 0.15)', text: '#374151' },
}

export default function AirtableBadge({ label, color = 'gray', style }: AirtableBadgeProps) {
  const colors = colorMap[color] || colorMap.gray

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '99px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </span>
  )
}
