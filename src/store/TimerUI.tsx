/**
 * TimerUI — controls the global timer bottom sheet (timer.md).
 * The sheet is mounted once in Layout; any page can open it:
 *
 *   const { openTimer } = useTimerUI()
 *   openTimer()                              // picker (or running, if a session is live)
 *   openTimer({ bookId })                    // pre-selected book → straight to running
 *   openTimer({ phase: 'manual', bookId })   // manual back-fill form
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/** 'summary' opens the sheet straight into the end-of-session summary (used by the pill's stop button). */
export type TimerPhase = 'picker' | 'running' | 'manual' | 'summary'

export interface OpenTimerOptions {
  bookId?: string
  phase?: TimerPhase
}

interface TimerUIContextValue {
  sheetOpen: boolean
  /** Phase requested when the sheet was opened (sheet may override internally). */
  requestedPhase?: TimerPhase
  preselectedBookId?: string
  openTimer: (opts?: OpenTimerOptions) => void
  /** Close/Minimize the sheet. A running session is never discarded by this. */
  closeTimer: () => void
}

const TimerUIContext = createContext<TimerUIContextValue | null>(null)

export function TimerUIProvider({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [requestedPhase, setRequestedPhase] = useState<TimerPhase | undefined>()
  const [preselectedBookId, setPreselectedBookId] = useState<string | undefined>()

  const openTimer = useCallback((opts?: OpenTimerOptions) => {
    setPreselectedBookId(opts?.bookId)
    setRequestedPhase(opts?.phase)
    setSheetOpen(true)
  }, [])

  const closeTimer = useCallback(() => {
    setSheetOpen(false)
    setRequestedPhase(undefined)
    setPreselectedBookId(undefined)
  }, [])

  const value = useMemo(
    () => ({ sheetOpen, requestedPhase, preselectedBookId, openTimer, closeTimer }),
    [sheetOpen, requestedPhase, preselectedBookId, openTimer, closeTimer],
  )

  return <TimerUIContext.Provider value={value}>{children}</TimerUIContext.Provider>
}

export function useTimerUI(): TimerUIContextValue {
  const ctx = useContext(TimerUIContext)
  if (!ctx) throw new Error('useTimerUI must be used within <TimerUIProvider>')
  return ctx
}
