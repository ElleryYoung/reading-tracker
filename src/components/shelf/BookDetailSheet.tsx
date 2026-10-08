/**
 * BookDetailSheet — bottom sheet (mobile) / centered 560px modal (≥768px)
 * with status switcher, page-progress stepper, per-book stats and action rows
 * (shelf.md §Section 3).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NotebookPen, PencilLine, Timer, Trash2, X } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import type { Book, BookStatus } from '@/types'
import { STATUS_LABEL } from '@/types'
import { useLibrary } from '@/store/LibraryStore'
import { useTimerUI } from '@/store/TimerUI'
import { useToast } from '@/components/Toast'
import { BookCover } from '@/components/BookCard'
import SegmentedControl from '@/components/SegmentedControl'
import CountUp from '@/components/CountUp'

const EASE = [0.33, 1, 0.68, 1] as [number, number, number, number]

const blockVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.12 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
}

function lastReadLabel(lastAt: number | null): string {
  if (!lastAt) return '—'
  const diff = differenceInCalendarDays(Date.now(), lastAt)
  if (diff <= 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 30) return `${diff} 天前`
  return `${Math.floor(diff / 30)} 个月前`
}

interface BookDetailSheetProps {
  bookId: string | null
  onClose: () => void
  onRequestDelete: (book: Book) => void
}

export default function BookDetailSheet({ bookId, onClose, onRequestDelete }: BookDetailSheetProps) {
  const { getBook, updateBook, sessions } = useLibrary()
  const { openTimer } = useTimerUI()
  const toast = useToast()

  const book = bookId ? getBook(bookId) : undefined
  // Keep last book around for exit animation
  const lastBook = useRef<Book | undefined>(undefined)
  if (book) lastBook.current = book
  const shown = book ?? lastBook.current

  const [pendingDone, setPendingDone] = useState(false)
  const [editingPage, setEditingPage] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const [editing, setEditing] = useState(false)

  // Reset local UI state whenever another book is opened
  useEffect(() => {
    setPendingDone(false)
    setEditingPage(false)
    setEditing(false)
  }, [bookId])

  // Auto-close if the book disappears (deleted elsewhere)
  useEffect(() => {
    if (bookId && !book) onClose()
  }, [bookId, book, onClose])

  // Body scroll lock while open
  useEffect(() => {
    if (!bookId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [bookId])

  const bookSessions = useMemo(
    () => (bookId ? sessions.filter((s) => s.bookId === bookId) : []),
    [sessions, bookId],
  )
  const totalMin = bookSessions.reduce((acc, s) => acc + s.minutes, 0)
  const lastAt = bookSessions.length
    ? Math.max(...bookSessions.map((s) => s.startAt))
    : null

  if (!shown) return null

  const changeStatus = (s: BookStatus) => {
    if (!book || s === book.status) return
    if (s === 'done') {
      setPendingDone(true)
      return
    }
    setPendingDone(false)
    updateBook(book.id, { status: s, finishedAt: undefined })
    toast(`已移至「${STATUS_LABEL[s]}」`)
  }

  const confirmDone = () => {
    if (!book) return
    updateBook(book.id, {
      status: 'done',
      finishedAt: Date.now(),
      currentPage: book.pageCount ?? book.currentPage,
    })
    toast('已移至「读完」')
    setPendingDone(false)
  }

  const setPage = (p: number) => {
    if (!book) return
    const max = book.pageCount ?? 99999
    updateBook(book.id, { currentPage: Math.max(0, Math.min(max, Math.round(p))) })
  }

  const pct =
    shown.pageCount && shown.pageCount > 0
      ? Math.min(100, (shown.currentPage / shown.pageCount) * 100)
      : 0

  return (
    <AnimatePresence>
      {bookId && book && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-[rgba(10,42,92,0.28)]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={shown.title}
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-line bg-card2 shadow-paper md:max-h-[85vh] md:w-[560px] md:rounded-[20px]"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            {/* drag handle (mobile) */}
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line md:hidden" />
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper hover:text-ink-primary"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <motion.div
              variants={blockVariants}
              initial="hidden"
              animate="show"
              className="overflow-y-auto px-5 pb-8 pt-4"
            >
              {/* ---- 1. header ---- */}
              <motion.div variants={itemVariants} className="flex gap-4 pr-8">
                <BookCover book={shown} width={72} />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-3 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
                    {shown.title}
                  </h2>
                  <p className="mt-1 text-[15px] leading-[1.6] text-ink-secondary">
                    {shown.authors.join('、') || '未知作者'}
                  </p>
                  {(shown.publisher || shown.publishedDate) && (
                    <p className="mt-0.5 text-[12px] leading-[1.4] text-ink-muted">
                      {[shown.publisher, shown.publishedDate].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {shown.isbn && (
                    <p className="mt-0.5 text-[12px] leading-[1.4] text-ink-muted">
                      ISBN {shown.isbn}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* ---- 2. status switcher ---- */}
              <motion.div variants={itemVariants} className="mt-5">
                <SegmentedControl<BookStatus>
                  id="detail-seg"
                  options={[
                    { value: 'want', label: '想读' },
                    { value: 'reading', label: '在读' },
                    { value: 'done', label: '读完' },
                  ]}
                  value={shown.status}
                  onChange={changeStatus}
                />
                <AnimatePresence>
                  {pendingDone && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5">
                        <p className="text-[13px] leading-[1.4] text-ink-secondary">
                          已完成？{shown.pageCount ? '当前页将设为总页数' : '将标记为读完'}
                        </p>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingDone(false)}
                            className="h-8 rounded-full border-[1.5px] border-ink-primary/30 px-3.5 text-[13px] font-medium text-ink-primary"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={confirmDone}
                            className="h-8 rounded-full bg-ink-primary px-3.5 text-[13px] font-medium text-paper"
                          >
                            确认
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ---- 3. page progress (reading only) ---- */}
              {shown.status === 'reading' && (
                <motion.div variants={itemVariants} className="mt-5 rounded-[14px] border border-line bg-paper p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    {editingPage ? (
                      <input
                        autoFocus
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={shown.pageCount ?? undefined}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={() => {
                          if (pageInput !== '') setPage(Number(pageInput))
                          setEditingPage(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setEditingPage(false)
                        }}
                        className="h-10 w-28 rounded-lg border border-ink-primary bg-card2 px-2 text-center font-display text-[24px] font-semibold text-ink-primary outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPageInput(String(shown.currentPage))
                          setEditingPage(true)
                        }}
                        className="text-left"
                        aria-label="直接输入页码"
                      >
                        <span className="tnum font-display text-[28px] font-semibold leading-[1.1] text-ink-primary">
                          {shown.currentPage}
                        </span>
                        <span className="ml-1.5 text-[12px] leading-[1.4] text-ink-muted">
                          / {shown.pageCount ?? '—'} 页
                        </span>
                      </button>
                    )}
                    <span className="tnum text-[12px] leading-[1.4] text-ink-muted">
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-heat-0">
                    <motion.div
                      className="h-full rounded-full bg-status-reading"
                      initial={false}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.3, ease: EASE }}
                    />
                  </div>
                  <div className="mt-3.5 flex gap-2">
                    {[-10, -1, 1, 10].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setPage(shown.currentPage + d)}
                        className="h-11 flex-1 rounded-full border-[1.5px] border-ink-primary/30 text-[14px] font-medium text-ink-primary transition-colors hover:bg-card2 active:bg-heat-0"
                      >
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ---- 4. per-book stats ---- */}
              <motion.div
                variants={itemVariants}
                className="mt-5 grid grid-cols-3 divide-x divide-line rounded-[14px] border border-line bg-paper py-3.5"
              >
                <div className="px-3 text-center">
                  <p className="text-[12px] leading-[1.4] text-ink-muted">累计时长</p>
                  <p className="mt-1 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
                    <CountUp value={totalMin / 60} decimals={1} duration={600} />
                    <span className="text-[13px]">h</span>
                  </p>
                </div>
                <div className="px-3 text-center">
                  <p className="text-[12px] leading-[1.4] text-ink-muted">时段数</p>
                  <p className="mt-1 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
                    <CountUp value={bookSessions.length} duration={600} />
                  </p>
                </div>
                <div className="px-3 text-center">
                  <p className="text-[12px] leading-[1.4] text-ink-muted">最近阅读</p>
                  <p className="mt-1 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
                    {lastReadLabel(lastAt)}
                  </p>
                </div>
              </motion.div>

              {/* ---- 5. edit form / action rows ---- */}
              {editing && book ? (
                <EditForm
                  key={`edit-${book.id}`}
                  book={book}
                  onDone={(saved) => {
                    setEditing(false)
                    if (saved) toast('已保存修改')
                  }}
                />
              ) : (
                <motion.div variants={itemVariants} className="mt-5">
                  {[
                    {
                      icon: Timer,
                      label: '开始计时',
                      cls: 'text-ink-primary',
                      onClick: () => {
                        onClose()
                        openTimer({ bookId: shown.id })
                      },
                    },
                    {
                      icon: PencilLine,
                      label: '手动补录时长',
                      cls: 'text-ink-primary',
                      onClick: () => {
                        onClose()
                        openTimer({ phase: 'manual', bookId: shown.id })
                      },
                    },
                    {
                      icon: NotebookPen,
                      label: '编辑信息',
                      cls: 'text-ink-primary',
                      onClick: () => setEditing(true),
                    },
                    {
                      icon: Trash2,
                      label: '从书架移除',
                      cls: 'text-danger2',
                      onClick: () => book && onRequestDelete(book),
                    },
                  ].map((a, i) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={a.onClick}
                      className={`flex w-full items-center gap-3 py-3.5 text-left text-[15px] font-medium ${a.cls} ${i > 0 ? 'border-t border-line' : ''}`}
                    >
                      <a.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                      {a.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ============================== Inline edit form ============================== */

const fieldCls =
  'h-11 w-full rounded-xl border border-line bg-card2 px-3 text-[15px] leading-[1.6] text-ink-primary outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-ink-primary'

function EditForm({ book, onDone }: { book: Book; onDone: (saved: boolean) => void }) {
  const { updateBook } = useLibrary()
  const [title, setTitle] = useState(book.title)
  const [authors, setAuthors] = useState(book.authors.join('、'))
  const [publisher, setPublisher] = useState(book.publisher ?? '')
  const [pages, setPages] = useState(book.pageCount ? String(book.pageCount) : '')
  const [categories, setCategories] = useState(book.categories.join('、'))

  const splitList = (s: string) =>
    s
      .split(/[,，、;；]/)
      .map((x) => x.trim())
      .filter(Boolean)

  const save = () => {
    if (!title.trim()) return
    const pageCount = pages ? Math.max(0, Math.round(Number(pages))) : undefined
    updateBook(book.id, {
      title: title.trim(),
      authors: splitList(authors),
      publisher: publisher.trim() || undefined,
      pageCount: Number.isFinite(pageCount) ? pageCount : undefined,
      categories: splitList(categories),
      currentPage: pageCount ? Math.min(book.currentPage, pageCount) : book.currentPage,
    })
    onDone(true)
  }

  return (
    <div className="mt-5 rounded-[14px] border border-line bg-paper p-4">
      <p className="label-eyebrow text-ink-muted">编辑信息</p>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium leading-[1.4] text-ink-secondary">书名</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium leading-[1.4] text-ink-secondary">作者（、分隔）</span>
          <input value={authors} onChange={(e) => setAuthors(e.target.value)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium leading-[1.4] text-ink-secondary">出版社</span>
          <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium leading-[1.4] text-ink-secondary">总页数</span>
          <input
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            className={fieldCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium leading-[1.4] text-ink-secondary">分类（、分隔）</span>
          <input value={categories} onChange={(e) => setCategories(e.target.value)} className={fieldCls} />
        </label>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => onDone(false)}
          className="h-11 flex-1 rounded-full border-[1.5px] border-ink-primary/30 text-[14px] font-medium text-ink-primary transition-colors hover:bg-card2"
        >
          取消
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!title.trim()}
          className="h-11 flex-1 rounded-full bg-ink-primary text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          保存
        </button>
      </div>
    </div>
  )
}
