'use client'

interface ProgressRingProps {
  value: number   // 0–100
  size?: number
  stroke?: number
  color?: string
}

export function ProgressRing({ value, size = 64, stroke = 5, color = '#2ECC9A' }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        fill="currentColor" fontSize={size * 0.22}
        fontWeight="600"
        className="rotate-90 text-foreground"
        style={{ transform: `rotate(90deg) translate(0px, -${size}px)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {Math.round(value)}%
      </text>
    </svg>
  )
}
