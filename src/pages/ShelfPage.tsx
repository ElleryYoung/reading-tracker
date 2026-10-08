/**
 * ShelfPage — `/shelf` (shelf.md). Three-status library with a sticky segmented
 * filter (+ counts), in-shelf search, status-aware rows and a rich detail sheet.
 * Deep-link: `/shelf?status=want|reading|done` (stats donut taps land here).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { format } from 'date-fns'
import type { Book, BookStatus } from '@/types'
import { STATUS_LABEL, STORAGE_KEY } from '@/types'
import { useLibrary } from '@/store/LibraryStore'
import { useToast } from '@/components/Toast'
import SegmentedControl from '@/components/SegmentedControl'
import EmptyState from '@/components/EmptyState'
import ShelfBookRow from '@/components/shelf/ShelfBookRow'
import BookDetailSheet from '@/components/shelf/BookDetailSheet'
import DeleteBookDialog from '@/components/shelf/DeleteBookDialog'
import { statusCounts } from '@/lib/stats'

const EASE = [0.33, 1, 0.68, 1] as [number, number, number, number]

type Filter = 'all' | BookStatus

const STATUS_COLOR: Record<BookStatus, string> = {
  want: 'text-status-want',
  reading: 'text-status-reading',
  done: 'text-status-done',
}

function parseStatus(raw: string | null): Filter {
  return raw === 'want' || raw === 'reading' || raw === 'done' ? raw : 'all'
}

export default function ShelfPage() {
  const { books, sessions, updateBook } = useLibrary()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [filter, setFilter] = useState<Filter>(() => parseStatus(params.get('status')))
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)

  // React to deep-link changes (e.g. stats donut tap while already on /shelf)
  const statusParam = params.get('status')
  useEffect(() => {
    setFilter(parseStatus(statusParam))
  }, [statusParam])

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setParams(f === 'all' ? {} : { status: f }, { replace: true })
  }

  /* ---------- derived data ---------- */
  const counts = useMemo(() => statusCounts(books), [books])

  const minutesByBook = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sessions) m.set(s.bookId, (m.get(s.bookId) ?? 0) + s.minutes)
    return m
  }, [sessions])

  const lastSessionByBook = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sessions) m.set(s.bookId, Math.max(m.get(s.bookId) ?? 0, s.startAt))
    return m
  }, [sessions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = books.filter((b) => {
      if (filter !== 'all' && b.status !== filter) return false
      if (!q) return true
      return (
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q))
      )
    })
    return [...list].sort((a, b) => {
      if (filter === 'reading') {
        return (lastSessionByBook.get(b.id) ?? b.addedAt) - (lastSessionByBook.get(a.id) ?? a.addedAt)
      }
      return b.addedAt - a.addedAt
    })
  }, [books, filter, query, lastSessionByBook])

  /* ---------- sticky bar stuck detection ---------- */
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const el = sentinelRef.current
      if (!el) return
      const top = window.innerWidth >= 1024 ? 64 : 0
      setStuck(el.getBoundingClientRect().top <= top)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ---------- actions ---------- */
  const changeStatus = (book: Book, s: BookStatus) => {
    if (s === book.status) return
    if (s === 'done') {
      updateBook(book.id, {
        status: 'done',
        finishedAt: Date.now(),
        currentPage: book.pageCount ?? book.currentPage,
      })
    } else {
      updateBook(book.id, { status: s, finishedAt: undefined })
    }
    toast(`已移至「${STATUS_LABEL[s]}」`)
  }

  const exportJSON = () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? JSON.stringify({ books, sessions })
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reading-log-${format(Date.now(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('已导出数据')
  }

  const deleteCount = deleteTarget
    ? sessions.filter((s) => s.bookId === deleteTarget.id).length
    : 0

  const segOptions: { value: Filter; label: string }[] = [
    { value: 'all', label: `全部 ${counts.total}` },
    { value: 'want', label: `想读 ${counts.want}` },
    { value: 'reading', label: `在读 ${counts.reading}` },
    { value: 'done', label: `读完 ${counts.done}` },
  ]

  return (
    <div className="mx-auto w-full lg:max-w-[640px]">
      {/* ================= Section 0 — header ================= */}
      <header>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="label-eyebrow text-copper"
        >
          书架 · BOOKSHELF
        </motion.p>
        <div className="mt-2 flex items-baseline gap-3">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: EASE }}
            className="font-display text-[26px] font-semibold leading-[1.25] text-ink-primary"
          >
            我的书架
          </motion.h1>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="text-[15px] leading-[1.6] text-ink-muted"
          >
            {books.length} 本
          </motion.span>
        </div>
        <div className="mt-2 flex items-center text-[12px] leading-[1.4] text-ink-secondary">
          {(['want', 'reading', 'done'] as BookStatus[]).map((s, i) => (
            <motion.span
              key={s}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
              className="flex items-center"
            >
              {i > 0 && <span className="mx-2.5 h-3 w-px bg-line" />}
              {STATUS_LABEL[s]}&nbsp;
              <span className={`tnum font-medium ${STATUS_COLOR[s]}`}>{counts[s]}</span>
            </motion.span>
          ))}
        </div>
      </header>

      {/* ================= Section 1 — sticky filter & search ================= */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div
        className={`sticky top-0 z-40 -mx-5 mt-4 bg-paper/85 px-5 py-3 backdrop-blur-[8px] transition-[border-color] duration-200 lg:top-16 lg:-mx-8 lg:px-8 ${
          stuck ? 'border-b border-line' : 'border-b border-transparent'
        }`}
      >
        <SegmentedControl<Filter>
          id="shelf-seg"
          options={segOptions}
          value={filter}
          onChange={changeFilter}
        />
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted"
            strokeWidth={1.5}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索书名或作者…"
            aria-label="搜索书架"
            className="h-10 w-full rounded-xl border border-line bg-card2 pl-9 pr-9 text-[14px] text-ink-primary outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-ink-primary"
          />
          {query && (
            <button
              type="button"
              aria-label="清除搜索"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink-primary"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* ================= Section 2 — book list ================= */}
      <div className="mt-5">
        {books.length === 0 ? (
          <EmptyState
            image={`${import.meta.env.BASE_URL}illu-empty-shelf.png`}
            title="书架还是空的"
            body="去搜索添加你的第一本书吧"
            actionLabel="添加书籍"
            onAction={() => navigate('/add')}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <img
              src={`${import.meta.env.BASE_URL}illu-empty-shelf.png`}
              alt=""
              width={120}
              height={120}
              style={{ width: 120, height: 120, objectFit: 'contain' }}
            />
            <h2 className="mt-3 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
              {query ? '没有找到匹配的书' : '这个分类还没有书'}
            </h2>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-muted">
              {query ? '换个关键词试试' : '添加一本，或切换到其他分类看看'}
            </p>
            {!query && (
              <button
                type="button"
                onClick={() => navigate('/add')}
                className="mt-5 h-12 rounded-full border-[1.5px] border-ink-primary/40 px-7 text-[15px] font-medium text-ink-primary transition-colors hover:bg-card2"
              >
                添加书籍
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${filter}|${query.trim().toLowerCase()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              {filtered.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.055, ease: EASE }}
                >
                  <ShelfBookRow
                    book={b}
                    minutes={minutesByBook.get(b.id) ?? 0}
                    onOpen={(bk) => setDetailId(bk.id)}
                    onDelete={(bk) => setDeleteTarget(bk)}
                    onChangeStatus={changeStatus}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ================= Section 4 — utility footer ================= */}
      {books.length > 0 && (
        <div className="mt-10 flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={exportJSON}
            className="label-eyebrow text-copper transition-opacity hover:opacity-70"
          >
            导出数据 (JSON)
          </button>
          <span className="text-[12px] leading-[1.4] text-ink-muted">
            共 {books.length} 本书 · {sessions.length} 条记录
          </span>
        </div>
      )}

      {/* ================= Section 3 — detail sheet & delete dialog ================= */}
      <BookDetailSheet
        bookId={detailId}
        onClose={() => setDetailId(null)}
        onRequestDelete={(bk) => {
          setDetailId(null)
          setDeleteTarget(bk)
        }}
      />
      <DeleteBookDialog
        book={deleteTarget}
        sessionCount={deleteCount}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
