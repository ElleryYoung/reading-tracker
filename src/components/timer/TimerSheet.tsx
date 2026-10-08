/**
 * TimerSheet — global bottom sheet (timer.md). Three modes + summary state:
 *   picker → running → summary, plus manual back-fill.
 * Mounted in Layout. Open it via useTimerUI().openTimer().
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { Check, ChevronDown, Flame, Minus, Pause, Play, Plus, Search, Square, X } from 'lucide-react'
import { useLibrary } from '@/store/LibraryStore'
import { useTimerUI } from '@/store/TimerUI'
import { useToast } from '@/components/Toast'
import { BookCover } from '@/components/BookCard'
import StatusChip from '@/components/StatusChip'
import useNow from '@/hooks/useNow'
import { currentStreak, formatElapsed, minutesOnDay } from '@/lib/stats'

type Phase = 'picker' | 'running' | 'summary' | 'manual'

interface PendingSummary {
  bookId: string
  ms: number
  startAt: number
  endAt: number
}

export default function TimerSheet() {
  const { sheetOpen, requestedPhase, preselectedBookId, closeTimer } = useTimerUI()
  const { activeSession, startSession, elapsedMs } = useLibrary()
  const [phase, setPhase] = useState<Phase>('picker')
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>()
  const [pending, setPending] = useState<PendingSummary | null>(null)

  // Initialize phase whenever the sheet opens
  useEffect(() => {
    if (!sheetOpen) return
    setSelectedBookId(preselectedBookId)
    if (requestedPhase === 'summary' && activeSession) {
      const now = Date.now()
      const ms = elapsedMs(now)
      setPending({ bookId: activeSession.bookId, ms, startAt: now - ms, endAt: now })
      setPhase('summary')
    } else if (requestedPhase === 'manual') {
      setPhase('manual')
    } else if (activeSession) {
      setPhase('running')
    } else if (requestedPhase === 'running' && preselectedBookId) {
      startSession(preselectedBookId)
      setPhase('running')
    } else {
      setPhase('picker')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen])

  const beginEnd = () => {
    if (!activeSession) return
    const now = Date.now()
    const ms = elapsedMs(now)
    setPending({ bookId: activeSession.bookId, ms, startAt: now - ms, endAt: now })
    // brief ring-complete beat, then crossfade to summary
    window.setTimeout(() => setPhase('summary'), 350)
  }

  const close = () => {
    closeTimer()
    setPending(null)
  }

  return (
    <AnimatePresence>
      {sheetOpen && (
        <motion.div
          className="fixed inset-0 z-[70] lg:flex lg:items-center lg:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* backdrop: tap-outside minimizes (never discards a running session) */}
          <div className="absolute inset-0 bg-[rgba(10,42,92,0.28)]" onClick={close} />
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110) close()
            }}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[20px] border border-line bg-card2 shadow-paper lg:relative lg:max-h-[86dvh] lg:max-w-[480px] lg:rounded-[20px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="flex justify-center pb-1 pt-2.5">
              <div className="h-1 w-10 cursor-grab rounded-full bg-line" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
                >
                  {phase === 'picker' && (
                    <PickerPhase
                      selectedBookId={selectedBookId}
                      onSelect={setSelectedBookId}
                      onStart={() => {
                        if (!selectedBookId) return
                        startSession(selectedBookId)
                        setPhase('running')
                      }}
                      onManual={() => setPhase('manual')}
                      onClose={close}
                    />
                  )}
                  {phase === 'running' && (
                    <RunningPhase onEnd={beginEnd} onMinimize={close} />
                  )}
                  {phase === 'summary' && pending && (
                    <SummaryPhase pending={pending} onDone={close} />
                  )}
                  {phase === 'manual' && (
                    <ManualPhase
                      initialBookId={selectedBookId}
                      onDone={close}
                      onBack={() => setPhase('picker')}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ============================== Mode 1 — Picker ============================== */

function PickerPhase({
  selectedBookId,
  onSelect,
  onStart,
  onManual,
  onClose,
}: {
  selectedBookId?: string
  onSelect: (id: string) => void
  onStart: () => void
  onManual: () => void
  onClose: () => void
}) {
  const { books } = useLibrary()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const reading = books.filter((b) => b.status === 'reading')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return books
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)),
    )
  }, [books, query])

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 pb-10 pt-2 text-center">
        <SheetHeader title="开始阅读计时" onClose={onClose} />
        <img src={`${import.meta.env.BASE_URL}illu-timer.png`} alt="" className="mt-4 h-[140px] w-[140px] object-contain" />
        <p className="mt-4 text-[15px] leading-[1.6] text-ink-muted">先添加一本书再开始计时</p>
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/add')
          }}
          className="mt-5 h-11 rounded-full border-[1.5px] border-ink-primary/40 px-6 text-[14px] font-medium text-ink-primary"
        >
          去添加
        </button>
      </div>
    )
  }

  return (
    <div className="flex max-h-[70dvh] flex-col px-5 pb-5">
      <SheetHeader title="开始阅读计时" onClose={onClose} />
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onManual}
          className="label-eyebrow text-copper transition-opacity hover:opacity-70"
        >
          手动补录 ›
        </button>
      </div>

      {reading.length > 0 && (
        <>
          <p className="label-eyebrow mb-2.5 text-ink-muted">在读中</p>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {reading.map((b, i) => (
              <motion.button
                key={b.id}
                type="button"
                onClick={() => onSelect(b.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
                className={`w-[88px] shrink-0 rounded-xl border bg-card2 p-1.5 text-left transition-all ${
                  selectedBookId === b.id
                    ? 'border-2 border-copper -translate-y-0.5 shadow-paper'
                    : 'border-line'
                }`}
              >
                <BookCover book={b} width={76} className="rounded-lg" />
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.3] text-ink-secondary">
                  {b.title}
                </p>
              </motion.button>
            ))}
          </div>
        </>
      )}

      <p className="label-eyebrow mb-2 mt-4 text-ink-muted">全部书籍</p>
      <div className="mb-3 flex h-10 items-center gap-2 rounded-full border border-line bg-paper px-3.5">
        <Search className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索书架…"
          className="h-full w-full bg-transparent text-[14px] text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {filtered.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            className={`flex h-11 w-full items-center gap-2.5 rounded-lg px-1.5 text-left transition-colors ${
              selectedBookId === b.id ? 'bg-heat-1/50' : 'hover:bg-paper'
            }`}
          >
            <BookCover book={b} width={28} />
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink-primary">{b.title}</span>
            <StatusChip status={b.status} />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-[13px] text-ink-muted">没有匹配的书籍</p>
        )}
      </div>

      <button
        type="button"
        disabled={!selectedBookId}
        onClick={onStart}
        className={`mt-4 h-[52px] w-full rounded-full text-[15px] font-medium transition-all active:scale-[0.97] ${
          selectedBookId
            ? 'bg-ink-primary text-paper'
            : 'cursor-not-allowed bg-ink-muted/20 text-ink-muted'
        }`}
      >
        开始计时
      </button>
    </div>
  )
}

/* ============================== Mode 2 — Running ============================== */

function RunningPhase({ onEnd, onMinimize }: { onEnd: () => void; onMinimize: () => void }) {
  const { activeSession, getBook, elapsedMs, pauseSession, resumeSession, updateBook } =
    useLibrary()
  const now = useNow(!!activeSession?.running)
  if (!activeSession) return null
  const book = getBook(activeSession.bookId)
  const ms = elapsedMs(now)
  const running = activeSession.running
  const minutes = ms / 60000
  const hourProgress = (minutes % 60) / 60

  const R = 88
  const C = 2 * Math.PI * R

  return (
    <div className="flex flex-col items-center px-6 pb-8 pt-1">
      {/* book context */}
      {book && (
        <div className="flex flex-col items-center">
          <BookCover book={book} width={64} />
          <p className="mt-2.5 max-w-[260px] truncate font-display text-[16px] font-medium leading-[1.35] text-ink-primary">
            {book.title}
          </p>
          <p className="text-[12px] leading-[1.4] text-ink-muted">
            {book.authors.join('、') || '未知作者'}
          </p>
        </div>
      )}

      {/* timer hero with progress ring */}
      <div className="relative mt-5 flex h-[200px] w-[200px] items-center justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#EDE8DC" strokeWidth="3" />
          <motion.circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="#A09070"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - hourProgress) }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          />
        </svg>
        <span
          key={Math.floor(ms / 1000)}
          className={`tnum font-display text-[52px] font-semibold leading-none ${
            running ? 'text-ink-primary' : 'text-ink-muted'
          }`}
        >
          {running ? (
            formatElapsed(ms)
          ) : (
            <PausedTime value={formatElapsed(ms)} />
          )}
        </span>
      </div>

      <p className="mt-3 text-[15px] leading-[1.6] text-ink-secondary">
        {running ? '专注阅读中…' : `已暂停 · 本次累计 ${Math.floor(minutes)} 分钟`}
      </p>

      {/* controls */}
      <div className="mt-6 flex items-center gap-6">
        <button
          type="button"
          aria-label={running ? '暂停' : '继续'}
          onClick={() => (running ? pauseSession() : resumeSession())}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-primary text-paper shadow-paper transition-transform active:scale-95"
        >
          {running ? (
            <Pause className="h-6 w-6" strokeWidth={2} />
          ) : (
            <Play className="ml-0.5 h-6 w-6" strokeWidth={2} />
          )}
        </button>
        <button
          type="button"
          aria-label="结束本次阅读"
          onClick={onEnd}
          className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-danger2 text-danger2 transition-transform active:scale-95"
        >
          <Square className="h-[18px] w-[18px]" strokeWidth={2} fill="currentColor" />
        </button>
      </div>

      <button
        type="button"
        onClick={onMinimize}
        className="label-eyebrow mt-5 flex items-center gap-1 text-copper transition-opacity hover:opacity-70"
      >
        收起，继续计时 <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {/* quick page note */}
      {book && book.pageCount ? (
        <div className="mt-6 flex items-center gap-3 rounded-full border border-line bg-paper px-4 py-2">
          <span className="text-[12px] leading-[1.4] text-ink-muted">读到哪一页？</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="减少页码"
              onClick={() => updateBook(book.id, { currentPage: Math.max(0, book.currentPage - 1) })}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-secondary"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <span className="tnum w-12 text-center text-[14px] font-medium text-ink-primary">
              {book.currentPage}
            </span>
            <button
              type="button"
              aria-label="增加页码"
              onClick={() =>
                updateBook(book.id, { currentPage: Math.min(book.pageCount!, book.currentPage + 1) })
              }
              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-secondary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Paused digits with a soft-blinking colon. */
function PausedTime({ value }: { value: string }) {
  const parts = value.split(':')
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="animate-colon-blink">:</span>}
          {p}
        </span>
      ))}
    </span>
  )
}

/* ============================== Summary ============================== */

function SummaryPhase({
  pending,
  onDone,
}: {
  pending: PendingSummary
  onDone: () => void
}) {
  const { getBook, endSession, discardActiveSession, sessions } = useLibrary()
  const toast = useToast()
  const book = getBook(pending.bookId)
  const minutes = Math.round(pending.ms / 60000)
  const tooShort = minutes < 1
  const [pages, setPages] = useState('')
  const [celebrateStreak, setCelebrateStreak] = useState<number | null>(null)

  const save = (allowShort: boolean) => {
    const hadToday = minutesOnDay(sessions, new Date()) > 0
    const before = currentStreak(sessions)
    const session = endSession({
      pagesRead: pages ? Math.max(0, parseInt(pages, 10) || 0) : undefined,
      allowShort,
    })
    if (!session) {
      onDone()
      return
    }
    toast(`已记录 ${session.minutes} 分钟`)
    const newStreak = hadToday ? before : before + 1
    if (!hadToday && newStreak >= 3) {
      setCelebrateStreak(newStreak)
      window.setTimeout(onDone, 1700)
    } else {
      onDone()
    }
  }

  const discard = () => {
    discardActiveSession()
    toast('已放弃本次计时')
    onDone()
  }

  const timeRange = `${fmtTime(pending.startAt)}–${fmtTime(pending.endAt)}`

  return (
    <div className="relative flex flex-col items-center overflow-hidden px-6 pb-8 pt-4">
      {celebrateStreak !== null && <ConfettiSquares />}
      <span className="tnum font-display text-[40px] font-semibold leading-none text-ink-primary">
        {Math.max(1, minutes)}
      </span>
      <span className="mt-1 text-[14px] text-ink-muted">分钟</span>
      <p className="mt-2 text-[12px] leading-[1.4] text-ink-muted">
        {book ? `《${book.title}》 · ` : ''}今天 {timeRange}
      </p>

      {tooShort && (
        <p className="mt-4 w-full rounded-xl border border-copper/40 bg-copper-soft/20 px-4 py-2.5 text-center text-[13px] text-copper">
          不足 1 分钟将不保存
        </p>
      )}

      {/* page logging */}
      <div className="mt-5 w-full">
        <p className="text-[13px] font-medium text-ink-secondary">本次读了多少页？（可选）</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="0"
            className="h-11 w-24 rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50"
          />
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPages(String((parseInt(pages, 10) || 0) + n))}
              className="h-9 rounded-full border border-line bg-paper px-3.5 text-[13px] font-medium text-ink-secondary transition-transform active:scale-105"
            >
              +{n}
            </button>
          ))}
        </div>
      </div>

      {celebrateStreak !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="mt-5 flex items-center gap-2 rounded-full bg-copper-soft/25 px-4 py-2"
        >
          <Flame className="h-4 w-4 text-copper" strokeWidth={1.5} fill="currentColor" />
          <span className="text-[14px] font-medium text-copper">
            连续阅读 {celebrateStreak} 天！
          </span>
        </motion.div>
      )}

      <div className="mt-6 w-full space-y-2.5">
        {tooShort ? (
          <button
            type="button"
            onClick={() => save(true)}
            className="h-[52px] w-full rounded-full bg-ink-primary text-[15px] font-medium text-paper transition-transform active:scale-[0.97]"
          >
            仍要保存
          </button>
        ) : (
          <button
            type="button"
            onClick={() => save(false)}
            className="h-[52px] w-full rounded-full bg-ink-primary text-[15px] font-medium text-paper transition-transform active:scale-[0.97]"
          >
            保存记录
          </button>
        )}
        <button
          type="button"
          onClick={discard}
          className="h-11 w-full rounded-full text-[14px] font-medium text-ink-muted transition-colors hover:text-ink-primary"
        >
          放弃本次
        </button>
      </div>
    </div>
  )
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Subtle one-time confetti: 6 flat copper/blue squares falling. */
function ConfettiSquares() {
  const squares = [
    { x: -90, color: '#A09070', delay: 0 },
    { x: -54, color: '#5E7FAE', delay: 0.08 },
    { x: -18, color: '#C9BBA0', delay: 0.04 },
    { x: 18, color: '#0A2A5C', delay: 0.12 },
    { x: 54, color: '#A09070', delay: 0.02 },
    { x: 90, color: '#93ABCB', delay: 0.1 },
  ]
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
      {squares.map((s, i) => (
        <motion.span
          key={i}
          className="absolute h-2.5 w-2.5"
          style={{ backgroundColor: s.color, x: s.x }}
          initial={{ y: -12, opacity: 1, rotate: 0 }}
          animate={{ y: 140, opacity: 0, rotate: 160 }}
          transition={{ duration: 0.6, delay: s.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

/* ============================== Mode 3 — Manual ============================== */

function ManualPhase({
  initialBookId,
  onDone,
  onBack,
}: {
  initialBookId?: string
  onDone: () => void
  onBack: () => void
}) {
  const { books, addManualSession } = useLibrary()
  const toast = useToast()
  const [bookId, setBookId] = useState<string | undefined>(initialBookId ?? books[0]?.id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
  const [date, setDate] = useState(todayStr)
  const [hours, setHours] = useState('')
  const [mins, setMins] = useState('')
  const [pages, setPages] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const book = books.find((b) => b.id === bookId)

  const derivedMinutes = useMemo(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const diff = eh * 60 + em - (sh * 60 + sm)
      if (diff > 0) return diff
    }
    return null
  }, [startTime, endTime])

  const totalMinutes = derivedMinutes ?? (parseInt(hours, 10) || 0) * 60 + (parseInt(mins, 10) || 0)
  const valid = !!bookId && !!date && totalMinutes >= 1

  const submit = () => {
    if (!valid || !bookId) return
    const [sh, sm] = startTime ? startTime.split(':').map(Number) : [12, 0]
    const startAt = new Date(`${date}T00:00:00`)
    startAt.setHours(sh, sm, 0, 0)
    addManualSession({
      bookId,
      startAt: startAt.getTime(),
      minutes: totalMinutes,
      pagesRead: pages ? Math.max(0, parseInt(pages, 10) || 0) : undefined,
    })
    toast(`已补录 ${totalMinutes} 分钟`)
    onDone()
  }

  const fieldAnim = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.045, duration: 0.3, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  })

  return (
    <div className="flex max-h-[80dvh] flex-col px-5 pb-6">
      <SheetHeader title="手动补录" onClose={onDone} onBack={onBack} />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-1">
        {/* book */}
        <motion.div {...fieldAnim(0)}>
          <FieldLabel>书籍</FieldLabel>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-paper p-2.5 text-left"
          >
            {book ? (
              <>
                <BookCover book={book} width={32} />
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-primary">
                  {book.title}
                </span>
              </>
            ) : (
              <span className="flex-1 text-[14px] text-ink-muted">选择一本书</span>
            )}
            <ChevronDown className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
          </button>
          {pickerOpen && (
            <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line bg-paper p-1.5">
              {books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBookId(b.id)
                    setPickerOpen(false)
                  }}
                  className="flex h-10 w-full items-center gap-2.5 rounded-lg px-1.5 text-left hover:bg-card2"
                >
                  <BookCover book={b} width={26} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink-primary">
                    {b.title}
                  </span>
                  {b.id === bookId && <Check className="h-4 w-4 text-copper" strokeWidth={2} />}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* date */}
        <motion.div {...fieldAnim(1)}>
          <FieldLabel>日期</FieldLabel>
          <input
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50"
          />
        </motion.div>

        {/* duration */}
        <motion.div {...fieldAnim(2)}>
          <FieldLabel>时长</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              disabled={derivedMinutes !== null}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50 disabled:opacity-40"
            />
            <span className="text-[14px] text-ink-muted">时</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={derivedMinutes !== null ? String(derivedMinutes % 60) : mins}
              onChange={(e) => setMins(e.target.value)}
              placeholder="0"
              disabled={derivedMinutes !== null}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50 disabled:opacity-40"
            />
            <span className="text-[14px] text-ink-muted">分</span>
          </div>
          <div className="mt-2 flex gap-2">
            {[15, 30, 45, 60].map((n) => (
              <motion.button
                key={n}
                type="button"
                whileTap={{ scale: 1.06 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  setStartTime('')
                  setEndTime('')
                  setHours(String(Math.floor(n / 60)))
                  setMins(String(n % 60))
                }}
                className="h-8 rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-ink-secondary"
              >
                {n} 分钟
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* pages */}
        <motion.div {...fieldAnim(3)}>
          <FieldLabel>页数（可选）</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="本次读了几页"
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50"
          />
        </motion.div>

        {/* time range */}
        <motion.div {...fieldAnim(4)}>
          <FieldLabel>时段（可选，填写后自动计算时长）</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50"
            />
            <span className="text-ink-muted">–</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink-primary outline-none focus:border-ink-primary/50"
            />
          </div>
        </motion.div>
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={submit}
        className={`mt-4 h-[52px] w-full shrink-0 rounded-full text-[15px] font-medium transition-all active:scale-[0.97] ${
          valid
            ? 'bg-ink-primary text-paper'
            : 'cursor-not-allowed bg-ink-muted/20 text-ink-muted'
        }`}
      >
        保存补录
      </button>
    </div>
  )
}

/* ============================== Shared bits ============================== */

function SheetHeader({
  title,
  onClose,
  onBack,
}: {
  title: string
  onClose: () => void
  onBack?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-1 pb-2 pt-1">
      <div className="flex items-center gap-2">
        <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" className="h-5 w-5" />
        <h2 className="font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] font-medium text-copper transition-opacity hover:opacity-70"
          >
            返回
          </button>
        )}
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper hover:text-ink-primary"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="label-eyebrow mb-1.5 text-ink-muted">{children}</p>
}
