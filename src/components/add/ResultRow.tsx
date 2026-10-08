/**
 * ResultRow — a Google Books result row for /add (add-book.md §2).
 * Book-card variant + add-button morph-to-check + inline detail accordion
 * with an initial-status picker.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Plus } from 'lucide-react'
import type { Book, BookStatus } from '@/types'
import { STATUS_LABEL } from '@/types'
import { BookCover } from '@/components/BookCard'
import SegmentedControl from '@/components/SegmentedControl'
import type { SearchResult } from '@/components/add/types'

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'want', label: '想读' },
  { value: 'reading', label: '在读' },
  { value: 'done', label: '读完' },
]

interface ResultRowProps {
  result: SearchResult
  /** True when the book is already on the shelf (duplicate guard) */
  inShelf: boolean
  index: number
  onAdd: (result: SearchResult, status: BookStatus) => void
}

export default function ResultRow({ result, inShelf, index, onAdd }: ResultRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<BookStatus>('want')
  const [ripple, setRipple] = useState(false)

  const added = inShelf
  const year = result.publishedDate?.slice(0, 4)
  const meta = [result.publisher, year, result.pageCount ? `${result.pageCount}页` : null]
    .filter(Boolean)
    .join(' · ')
  const coverBook = { title: result.title, coverUrl: result.coverUrl } as Book

  const handleAdd = () => {
    if (added) return
    onAdd(result, status)
    setRipple(true)
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.33, 1, 0.68, 1] }}
      className="rounded-[14px] border border-line bg-card2 p-3 shadow-paper"
    >
      <div className="flex items-center gap-3">
        {/* Row body — toggles accordion */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <BookCover book={coverBook} width={56} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-display text-[16px] font-medium leading-[1.35] text-ink-primary">
              {result.title}
            </p>
            <p className="mt-0.5 truncate text-[12px] leading-[1.4] text-ink-secondary">
              {result.authors.join('、') || '未知作者'}
            </p>
            {meta && (
              <p className="mt-0.5 truncate text-[12px] leading-[1.4] text-ink-muted">{meta}</p>
            )}
            {result.categories[0] && (
              <span className="mt-1.5 inline-flex h-[20px] items-center rounded-full bg-copper-soft/60 px-2 text-[12px] leading-none text-copper">
                {result.categories[0]}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            strokeWidth={1.5}
          />
        </button>

        {/* Add button — 36px circle, morphs to filled check */}
        <div className="relative shrink-0" title={added ? '已在书架' : undefined}>
          <motion.button
            type="button"
            aria-label={added ? '已在书架' : '加入书架'}
            disabled={added}
            onClick={handleAdd}
            whileTap={added ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 ${
              added
                ? 'bg-ink-primary text-paper'
                : 'border-[1.5px] border-ink-primary text-ink-primary hover:bg-ink-primary/5'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                </motion.span>
              ) : (
                <motion.span key="plus" exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          {/* Success ripple ring — expands once */}
          {ripple && (
            <motion.span
              key="ring"
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
              onAnimationComplete={() => setRipple(false)}
              className="pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-ink-primary"
            />
          )}
          {added && (
            <span className="mt-1 block text-center text-[10px] leading-none text-ink-muted">
              已在书架
            </span>
          )}
        </div>
      </div>

      {/* Inline detail accordion */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-line pt-3">
              {result.description && (
                <p className="line-clamp-3 text-[15px] leading-[1.6] text-ink-secondary">
                  {result.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] leading-[1.4] text-ink-muted">
                {result.pageCount ? <span>{result.pageCount} 页</span> : null}
                {result.isbn ? <span>ISBN {result.isbn}</span> : null}
                {result.categories.length > 0 ? (
                  <span>{result.categories.join(' · ')}</span>
                ) : null}
              </div>
              {!added && (
                <div className="mt-3">
                  <p className="label-eyebrow mb-2 text-ink-muted">初始状态</p>
                  <SegmentedControl
                    id={`status-${result.id}`}
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={setStatus}
                  />
                  <p className="mt-2 text-[12px] leading-[1.4] text-ink-muted">
                    将加入「{STATUS_LABEL[status]}」
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
