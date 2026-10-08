/**
 * ShelfBookRow — status-aware book row for the shelf list (shelf.md §Section 2).
 * Mobile swipe-left reveals flat action tiles: 状态 (copper, inline status menu)
 * and 删除 (danger). Desktop: hover lift with paper shadow.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRightLeft, ChevronRight, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Book, BookStatus } from '@/types'
import { STATUS_LABEL } from '@/types'
import { BookCover } from '@/components/BookCard'
import StatusChip from '@/components/StatusChip'

const ACTION_W = 144

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = () => setMatches(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return matches
}

export function fmtDate(ts: number): string {
  return format(ts, 'M月d日')
}

export function fmtHours(minutes: number): string {
  if (minutes <= 0) return '0 分钟'
  const h = minutes / 60
  if (h >= 1) return `${+h.toFixed(1)} 小时`
  return `${Math.round(minutes)} 分钟`
}

const STATUS_TILE: { value: BookStatus; label: string; cls: string }[] = [
  { value: 'want', label: '想读', cls: 'bg-copper text-paper' },
  { value: 'reading', label: '在读', cls: 'bg-status-reading text-paper' },
  { value: 'done', label: '读完', cls: 'bg-ink-primary text-paper' },
]

interface ShelfBookRowProps {
  book: Book
  /** Total invested minutes across this book's sessions */
  minutes: number
  onOpen: (book: Book) => void
  onDelete: (book: Book) => void
  onChangeStatus: (book: Book, status: BookStatus) => void
}

export default function ShelfBookRow({
  book,
  minutes,
  onOpen,
  onDelete,
  onChangeStatus,
}: ShelfBookRowProps) {
  const [open, setOpen] = useState(false)
  const [statusMenu, setStatusMenu] = useState(false)
  const isMd = useMediaQuery('(min-width: 768px)')

  const pct =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null

  const close = () => {
    setOpen(false)
    setStatusMenu(false)
  }

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      {/* ---- swipe action tiles ---- */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTION_W }}>
        {statusMenu ? (
          STATUS_TILE.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                if (t.value !== book.status) onChangeStatus(book, t.value)
                close()
              }}
              className={`flex flex-1 flex-col items-center justify-center text-[11px] font-medium ${t.cls}`}
            >
              {t.label}
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              aria-label="切换状态"
              onClick={() => setStatusMenu(true)}
              className="flex w-[72px] flex-col items-center justify-center gap-1 bg-copper text-[11px] font-medium text-paper"
            >
              <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
              状态
            </button>
            <button
              type="button"
              aria-label="删除"
              onClick={() => {
                close()
                onDelete(book)
              }}
              className="flex w-[72px] flex-col items-center justify-center gap-1 bg-danger2 text-[11px] font-medium text-paper"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              删除
            </button>
          </>
        )}
      </div>

      {/* ---- row card ---- */}
      <motion.div
        role="button"
        tabIndex={0}
        drag="x"
        dragConstraints={{ left: -ACTION_W, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        animate={{ x: open ? -ACTION_W : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) setOpen(true)
          else close()
        }}
        onTap={() => (open ? close() : onOpen(book))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(book)
          }
        }}
        className="relative flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-card2 p-3 transition-[box-shadow,transform] duration-[180ms] md:hover:-translate-y-0.5 md:hover:shadow-paper"
      >
        <BookCover book={book} width={isMd ? 64 : 56} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-display text-[16px] font-medium leading-[1.35] text-ink-primary">
            {book.title}
          </p>
          <p className="mt-0.5 truncate text-[12px] leading-[1.4] text-ink-muted">
            {[book.authors.join('、'), book.publisher].filter(Boolean).join(' · ') || '未知作者'}
          </p>

          {book.status === 'want' && (
            <div className="mt-2 flex items-center gap-2">
              <StatusChip status="want" />
              <span className="truncate text-[12px] leading-[1.4] text-ink-muted">
                {book.pageCount ? `${book.pageCount} 页 · ` : ''}加入于 {fmtDate(book.addedAt)}
              </span>
            </div>
          )}

          {book.status === 'reading' && (
            <div className="mt-2">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-heat-0">
                <div
                  className="h-full rounded-full bg-status-reading transition-[width] duration-300"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
              <p className="mt-1.5 truncate text-[12px] leading-[1.4] text-ink-muted">
                {book.pageCount ? `读到 ${book.currentPage}/${book.pageCount} 页` : '阅读中'}
                {minutes > 0 ? ` · 已投入 ${fmtHours(minutes)}` : ''}
              </p>
            </div>
          )}

          {book.status === 'done' && (
            <div className="mt-2 flex items-center gap-2">
              <StatusChip status="done" />
              <span className="truncate text-[12px] leading-[1.4] text-ink-muted">
                {book.finishedAt ? `完成于 ${fmtDate(book.finishedAt)}` : STATUS_LABEL.done}
                {minutes > 0 ? ` · 共投入 ${fmtHours(minutes)}` : ''}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} />
      </motion.div>
    </div>
  )
}
