/**
 * TimerPill — global floating timer pill (design.md §7.2, timer.md).
 * Idle: 52px deep-blue circle. Active: pill with live time + pause/stop.
 * Mounted in Layout; visible on all pages while the sheet is closed.
 */
import { memo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, Square, Timer } from 'lucide-react'
import { useLibrary } from '@/store/LibraryStore'
import { useTimerUI } from '@/store/TimerUI'
import { useToast } from '@/components/Toast'
import useNow from '@/hooks/useNow'
import { formatElapsed } from '@/lib/stats'

/** Breathing wrapper — isolated perpetual animation (perf: memoized micro-component). */
const Breathing = memo(function Breathing({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
})

export default function TimerPill() {
  const { activeSession, elapsedMs, pauseSession, resumeSession, restoredActiveSession } =
    useLibrary()
  const { sheetOpen, openTimer } = useTimerUI()
  const toast = useToast()
  const now = useNow(!!activeSession?.running)
  const restoredToasted = useRef(false)

  // "恢复了上次未完成的计时" after tab close/refresh
  useEffect(() => {
    if (restoredActiveSession && !restoredToasted.current) {
      restoredToasted.current = true
      toast('恢复了上次未完成的计时')
    }
  }, [restoredActiveSession, toast])

  if (sheetOpen) return null

  const ms = elapsedMs(now)
  const minuteProgress = (ms / 60000) % 1

  if (!activeSession) {
    return (
      <motion.button
        type="button"
        aria-label="打开阅读计时"
        onClick={() => openTimer({ phase: 'picker' })}
        className="fixed bottom-[76px] right-4 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink-primary text-paper shadow-paper"
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
      >
        <Timer className="h-[22px] w-[22px]" strokeWidth={1.5} />
      </motion.button>
    )
  }

  return (
    <div className="fixed bottom-[76px] right-4 z-40">
      <Breathing>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-full p-[2px] shadow-paper"
          style={{
            background: activeSession.running
              ? `conic-gradient(#A09070 ${minuteProgress * 360}deg, rgba(10,42,92,0.15) 0deg)`
              : 'rgba(10,42,92,0.15)',
          }}
        >
          <div className="flex h-[52px] items-center gap-1.5 rounded-full bg-ink-primary pl-4 pr-2 text-paper">
            <button
              type="button"
              onClick={() => openTimer({ phase: 'running' })}
              className="tnum font-display text-[17px] font-medium tracking-wide"
              aria-label="打开计时详情"
            >
              {formatElapsed(ms)}
            </button>
            <button
              type="button"
              aria-label={activeSession.running ? '暂停' : '继续'}
              onClick={() => (activeSession.running ? pauseSession() : resumeSession())}
              className="flex h-9 w-9 items-center justify-center rounded-full text-paper/90 transition-colors hover:bg-white/10"
            >
              {activeSession.running ? (
                <Pause className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Play className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              aria-label="结束本次阅读"
              onClick={() => openTimer({ phase: 'summary' })}
              className="flex h-9 w-9 items-center justify-center rounded-full text-paper/90 transition-colors hover:bg-white/10"
            >
              <Square className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
            </button>
          </div>
        </motion.div>
      </Breathing>
    </div>
  )
}
