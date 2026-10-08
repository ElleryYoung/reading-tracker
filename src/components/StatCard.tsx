/**
 * StatCard — design.md §7.6. Eyebrow label, big count-up number, caption, copper icon.
 */
import type { ReactNode } from 'react'
import CountUp from '@/components/CountUp'

interface StatCardProps {
  eyebrow: string
  value: number
  decimals?: number
  unit?: string
  caption?: string
  icon?: ReactNode
  /** Render the value without animation (e.g. custom content) */
  children?: ReactNode
}

export default function StatCard({
  eyebrow,
  value,
  decimals = 0,
  unit,
  caption,
  icon,
  children,
}: StatCardProps) {
  return (
    <div className="rounded-[14px] border border-line bg-card2 p-4 shadow-paper">
      <div className="flex items-start justify-between gap-2">
        <span className="label-eyebrow text-ink-muted">{eyebrow}</span>
        {icon && <span className="text-copper [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        {children ?? (
          <>
            <CountUp
              value={value}
              decimals={decimals}
              className="font-display text-[28px] font-semibold leading-[1.1] text-ink-primary"
            />
            {unit && <span className="text-[14px] text-ink-muted">{unit}</span>}
          </>
        )}
      </div>
      {caption && <p className="mt-1.5 text-[12px] leading-[1.4] text-ink-muted">{caption}</p>}
    </div>
  )
}
