import {
  Monitor, Home, Plane, GraduationCap, Car, Heart,
  PiggyBank, Shield, Target, Star,
  type LucideProps,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  monitor: Monitor,
  home: Home,
  plane: Plane,
  'graduation-cap': GraduationCap,
  car: Car,
  heart: Heart,
  'piggy-bank': PiggyBank,
  shield: Shield,
  target: Target,
  star: Star,
}

interface GoalIconProps {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

export function GoalIcon({ icon, color, size = 'md' }: GoalIconProps) {
  const Icon = ICON_MAP[icon] ?? Target
  const sizeMap = { sm: { box: 36, icon: 'w-4 h-4' }, md: { box: 48, icon: 'w-5 h-5' }, lg: { box: 64, icon: 'w-7 h-7' } }
  const { box, icon: iconClass } = sizeMap[size]

  return (
    <div
      className="rounded-2xl flex items-center justify-center shrink-0"
      style={{ width: box, height: box, backgroundColor: color + '20' }}
    >
      <Icon className={iconClass} color={color} />
    </div>
  )
}
