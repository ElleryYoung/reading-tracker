/**
 * BookCard — shared row card: shelf lists, search results, Top5 (design.md §7.4).
 */
import { motion } from 'framer-motion'
import type { Book } from '@/types'
import StatusChip from '@/components/StatusChip'

export function BookCover({
  book,
  width = 56,
  className = '',
}: {
  book: Book
  width?: number
  className?: string
}) {
  const height = Math.round(width * 1.5)
  if (book.coverUrl) {
    return (
      <img
        src={book.coverUrl}
        alt={book.title}
        width={width}
        height={height}
        loading="lazy"
        style={{ width, height }}
        className={`shrink-0 rounded border border-line object-cover ${className}`}
      />
    )
  }
  return (
    <div
      style={{ width, height, backgroundImage: 'url(/cover-fallback.svg)', backgroundSize: 'cover' }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded border border-line ${className}`}
    >
      <span
        className="px-1 text-center font-display font-medium leading-tight text-ink-primary line-clamp-3"
        style={{ fontSize: Math.max(8, width / 7) }}
      >
        {book.title}
      </span>
    </div>
  )
}

interface BookCardProps {
  book: Book
  onClick?: () => void
  /** Extra content rendered in the meta row (right side), e.g. minutes for Top5 */
  meta?: React.ReactNode
  /** Hide the status chip */
  hideStatus?: boolean
}

export default function BookCard({ book, onClick, meta, hideStatus }: BookCardProps) {
  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-card2 p-3 text-left shadow-paper"
    >
      <BookCover book={book} width={56} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-display text-[16px] font-medium leading-[1.35] text-ink-primary">
          {book.title}
        </p>
        <p className="mt-0.5 truncate text-[15px] leading-[1.6] text-ink-muted">
          {[book.authors.join('、'), book.publisher].filter(Boolean).join(' · ') || '未知作者'}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {!hideStatus && <StatusChip status={book.status} />}
          {book.pageCount ? (
            <span className="text-[12px] leading-[1.4] text-ink-muted">
              {book.currentPage > 0 ? `${book.currentPage} / ` : ''}
              {book.pageCount} 页
            </span>
          ) : null}
          {meta}
        </div>
        {progress !== null && book.status === 'reading' && (
          <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-heat-0">
            <div className="h-full rounded-full bg-heat-3" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </motion.button>
  )
}
