/**
 * SearchBar — hero search field for /add (add-book.md §1).
 * 52px pill, 1.5px deep-blue border, suggestion chips row.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Search, X } from 'lucide-react'

const SUGGESTIONS = ['村上春树', '三体', '原子习惯', 'SICP', '人类简史']

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Immediate search (Enter / arrow button / chip tap) */
  onSubmit: (query: string) => void
}

export default function SearchBar({ value, onChange, onSubmit }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  const submit = () => {
    const q = value.trim()
    if (q.length >= 2) onSubmit(q)
  }

  return (
    <div>
      <motion.div
        animate={{ scale: focused ? 1 : 0.995 }}
        transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
        className="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-ink-primary bg-card2 pl-4 pr-2 shadow-paper"
      >
        <Search className="h-5 w-5 shrink-0 text-ink-primary" strokeWidth={1.5} />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="搜索书名、作者或 ISBN…"
          aria-label="搜索书籍"
          className="h-full min-w-0 flex-1 appearance-none bg-transparent text-[15px] leading-[1.6] text-ink-primary outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="清空"
            onClick={() => onChange('')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink-primary"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          aria-label="搜索"
          onClick={submit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-primary text-paper transition-transform active:scale-95"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </motion.div>

      {/* Suggestion chips — horizontally scrollable, scrollbar hidden */}
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SUGGESTIONS.map((chip, i) => (
          <motion.button
            key={chip}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04, ease: [0.33, 1, 0.68, 1] }}
            onClick={() => {
              onChange(chip)
              onSubmit(chip)
            }}
            className="shrink-0 rounded-full border border-copper px-3 py-1 text-[12px] leading-[1.4] text-copper transition-colors hover:bg-copper-soft/30"
          >
            {chip}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
