/**
 * HeatmapCalendar — 90-day GitHub-style grid (stats.md §2). ★ HERO
 * 13 week-columns × 7 weekday-rows (Monday top). Custom CSS-grid, no lib.
 */
import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useLibrary } from '@/store/LibraryStore'
import { useTimerUI } from '@/store/TimerUI'
import { buildHeatmap, heatmapMonthLabels } from '@/lib/stats'
import type { HeatCell } from '@/lib/stats'

const HEAT_BG = ['#EDE8DC', '#C7D3E4', '#93ABCB', '#5E7FAE', '#0A2A5C']
const WEEKDAY_LABELS: (string | null)[] = ['Mo', null, 'We', null, 'Fr', null, null]

export default function HeatmapCalendar() {
  const { sessions } = useLibrary()
  const { openTimer } = useTimerUI()
  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(containerRef, { once: true, amount: 0.3 })
  const [selected, setSelected] = useState<string | null>(null)

  const weeks = useMemo(() => buildHeatmap(sessions, 90), [sessions])
  const monthLabels = useMemo(() => heatmapMonthLabels(weeks), [weeks])
  const labelByCol = useMemo(() => {
    const m = new Map<number, string>()
    for (const l of monthLabels) m.set(l.col, l.label)
    return m
  }, [monthLabels])

  const empty = sessions.length === 0

  return (
    <div ref={containerRef} className="relative rounded-[14px] border border-line bg-card2 p-5 shadow-paper">
      <div className="flex">
        {/* weekday gutter */}
        <div className="mr-2 flex flex-col gap-[3px]">
          <span className="h-4" />
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="flex h-3 w-5 items-center text-[10px] leading-none text-ink-muted max-[360px]:h-2.5 md:h-3.5"
            >
              {label}
            </span>
          ))}
        </div>
        {/* week columns */}
        <div className="flex flex-1 justify-between gap-[3px]">
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              <span className="h-4 text-[10px] leading-4 text-ink-muted">
                {labelByCol.get(ci) ?? ''}
              </span>
              {col.map((cell, ri) => (
                <Cell
                  key={cell.key}
                  cell={cell}
                  delay={(ci * 7 + ri) * 0.006}
                  animate={inView}
                  selected={selected === cell.key}
                  onTap={() => setSelected((s) => (s === cell.key ? null : cell.key))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <motion.div
        className="mt-3 flex items-center justify-end gap-1.5"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: weeks.length * 7 * 0.006 + 0.15, duration: 0.3 }}
      >
        <span className="text-[12px] leading-[1.4] text-ink-muted">少</span>
        {HEAT_BG.map((c) => (
          <span
            key={c}
            className="h-3 w-3 rounded-[3px] max-[360px]:h-2.5 max-[360px]:w-2.5 md:h-3.5 md:w-3.5"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="text-[12px] leading-[1.4] text-ink-muted">多</span>
      </motion.div>

      {/* empty overlay */}
      {empty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[14px] bg-card2/85 px-6 text-center backdrop-blur-[1px]">
          <img src="/illu-empty-stats.png" alt="" className="h-[120px] w-[120px] object-contain" />
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-secondary">
            还没有阅读记录，从一次计时开始吧
          </p>
          <button
            type="button"
            onClick={() => openTimer()}
            className="mt-4 h-11 rounded-full bg-ink-primary px-6 text-[14px] font-medium text-paper transition-transform active:scale-[0.97]"
          >
            开始计时
          </button>
        </div>
      )}
    </div>
  )
}

function Cell({
  cell,
  delay,
  animate,
  selected,
  onTap,
}: {
  cell: HeatCell
  delay: number
  animate: boolean
  selected: boolean
  onTap: () => void
}) {
  return (
    <div className="relative">
      <motion.button
        type="button"
        aria-label={`${cell.key} · ${cell.minutes} 分钟`}
        onClick={onTap}
        className={`block h-3 w-3 rounded-[3px] max-[360px]:h-2.5 max-[360px]:w-2.5 md:h-3.5 md:w-3.5 ${
          cell.isToday ? 'ring-[1.5px] ring-copper ring-offset-1 ring-offset-card2' : ''
        } ${!cell.inRange && cell.minutes === 0 ? 'opacity-40' : ''}`}
        style={{ backgroundColor: HEAT_BG[cell.level] }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={animate ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 22, delay }}
      />
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-primary px-2.5 py-1.5 text-[12px] leading-none text-paper shadow-paper"
          >
            {cell.date.getMonth() + 1}月{cell.date.getDate()}日 · {cell.minutes} 分钟
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
