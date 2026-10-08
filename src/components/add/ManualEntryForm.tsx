/**
 * ManualEntryForm — 手动补录 (add-book.md §3).
 * Editorial form on a bg-card panel with live cover preview, validation,
 * duplicate guard and an inline success card.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import type { Book, BookStatus } from '@/types'
import { useLibrary } from '@/store/LibraryStore'
import { useToast } from '@/components/Toast'
import { BookCover } from '@/components/BookCard'
import SegmentedControl from '@/components/SegmentedControl'

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'want', label: '想读' },
  { value: 'reading', label: '在读' },
  { value: 'done', label: '读完' },
]

const inputClass = (invalid: boolean) =>
  `h-12 w-full rounded-xl border bg-paper px-3.5 text-[15px] leading-[1.6] text-ink-primary outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-ink-primary ${
    invalid ? 'border-[1.5px] border-danger2' : 'border-line'
  }`

const labelClass = 'label-eyebrow mb-1.5 block text-ink-muted'

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export default function ManualEntryForm() {
  const { books, addBook } = useLibrary()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [publisher, setPublisher] = useState('')
  const [pageCount, setPageCount] = useState('')
  const [categories, setCategories] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [status, setStatus] = useState<BookStatus>('want')

  const [errors, setErrors] = useState<{ title?: boolean; authors?: boolean }>({})
  const [dupOpen, setDupOpen] = useState(false)
  const [coverBroken, setCoverBroken] = useState(false)
  const [addedBook, setAddedBook] = useState<Book | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Suggestion chips from categories already present in the shelf
  const shelfCategories = useMemo(() => {
    const set = new Set<string>()
    books.forEach((b) => b.categories.forEach((c) => set.add(c)))
    return [...set].slice(0, 8)
  }, [books])

  const validCover = coverUrl.trim() && !coverBroken ? coverUrl.trim() : undefined
  const previewBook = { title: title.trim() || '书名', coverUrl: validCover } as Book

  const parseList = (s: string) =>
    s
      .split(/[,，、]/)
      .map((x) => x.trim())
      .filter(Boolean)

  const findDuplicate = () => {
    const t = normalize(title)
    const a = normalize(parseList(authors)[0] ?? '')
    return books.find(
      (b) => normalize(b.title) === t && (a === '' || normalize(b.authors[0] ?? '') === a),
    )
  }

  const doAdd = () => {
    const book = addBook({
      title: title.trim(),
      authors: parseList(authors),
      publisher: publisher.trim() || undefined,
      pageCount: pageCount ? Math.max(0, parseInt(pageCount, 10)) || undefined : undefined,
      categories: parseList(categories),
      coverUrl: validCover,
      status,
    })
    toast('已加入书架')
    setAddedBook(book)
    setDupOpen(false)
    // Reset with a soft collapse feel
    setTitle('')
    setAuthors('')
    setPublisher('')
    setPageCount('')
    setCategories('')
    setCoverUrl('')
    setCoverBroken(false)
    setStatus('want')
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = { title: !title.trim(), authors: !authors.trim() }
    setErrors(next)
    if (next.title || next.authors) return
    if (findDuplicate()) {
      setDupOpen(true)
      return
    }
    doAdd()
  }

  return (
    <div>
      {/* Divider with centered label */}
      <div className="relative my-8 flex items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <span className="label-eyebrow relative bg-paper px-3 text-ink-muted">或手动补录</span>
      </div>

      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
        className="rounded-[14px] border border-line bg-card2 p-5 shadow-paper"
      >
        <form onSubmit={handleSubmit} noValidate>
          {/* Live cover preview + 书名 / 作者 */}
          <div className="flex gap-4">
            <div className="shrink-0">
              <span className={labelClass}>封面预览</span>
              {validCover ? (
                <img
                  key={validCover}
                  src={validCover}
                  alt="封面预览"
                  width={72}
                  height={108}
                  onError={() => setCoverBroken(true)}
                  className="h-[108px] w-[72px] rounded border border-line object-cover"
                />
              ) : (
                <BookCover book={previewBook} width={72} />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <label htmlFor="m-title" className={labelClass}>
                  书名 <span className="text-danger2">*</span>
                </label>
                <input
                  id="m-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：百年孤独"
                  className={inputClass(!!errors.title)}
                />
                {errors.title && (
                  <p className="mt-1 text-[12px] leading-[1.4] text-danger2">请填写书名</p>
                )}
              </div>
              <div>
                <label htmlFor="m-authors" className={labelClass}>
                  作者 <span className="text-danger2">*</span>
                </label>
                <input
                  id="m-authors"
                  type="text"
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="多位作者用逗号分隔"
                  className={inputClass(!!errors.authors)}
                />
                {errors.authors && (
                  <p className="mt-1 text-[12px] leading-[1.4] text-danger2">请填写作者</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="m-publisher" className={labelClass}>
                出版社
              </label>
              <input
                id="m-publisher"
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className={inputClass(false)}
              />
            </div>
            <div>
              <label htmlFor="m-pages" className={labelClass}>
                总页数
              </label>
              <input
                id="m-pages"
                type="number"
                inputMode="numeric"
                min={1}
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                placeholder="用于阅读进度计算"
                className={inputClass(false)}
              />
            </div>
            <div>
              <label htmlFor="m-categories" className={labelClass}>
                类别
              </label>
              <input
                id="m-categories"
                type="text"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="多个类别用逗号分隔"
                className={inputClass(false)}
              />
              {shelfCategories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shelfCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const list = parseList(categories)
                        if (!list.includes(c)) {
                          setCategories([...list, c].join('，'))
                        }
                      }}
                      className="rounded-full border border-copper-soft px-2 py-0.5 text-[12px] leading-[1.4] text-copper transition-colors hover:bg-copper-soft/30"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="m-cover" className={labelClass}>
                封面 URL
              </label>
              <input
                id="m-cover"
                type="url"
                value={coverUrl}
                onChange={(e) => {
                  setCoverUrl(e.target.value)
                  setCoverBroken(false)
                }}
                placeholder="粘贴图片链接（可选）"
                className={inputClass(false)}
              />
              {coverBroken && coverUrl.trim() && (
                <p className="mt-1 text-[12px] leading-[1.4] text-danger2">
                  图片无法加载，将使用默认封面
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <span className={labelClass}>
              初始状态 <span className="text-danger2">*</span>
            </span>
            <SegmentedControl
              id="manual-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </div>

          {/* Duplicate warning */}
          <AnimatePresence initial={false}>
            {dupOpen && (
              <motion.div
                key="dup"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-copper-soft bg-copper-soft/20 px-3.5 py-2.5">
                  <p className="text-[13px] leading-[1.4] text-copper">
                    书架中已有《{title.trim()}》，仍要添加？
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={doAdd}
                      className="h-8 rounded-full bg-copper px-3.5 text-[13px] font-medium text-paper transition-opacity hover:opacity-90"
                    >
                      仍要添加
                    </button>
                    <button
                      type="button"
                      onClick={() => setDupOpen(false)}
                      className="h-8 rounded-full border border-copper px-3.5 text-[13px] font-medium text-copper"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="mt-6 h-[52px] w-full rounded-full bg-ink-primary text-[15px] font-medium text-paper transition-opacity hover:opacity-95"
          >
            加入书架
          </motion.button>
        </form>
      </motion.div>

      {/* Inline success card */}
      <AnimatePresence>
        {addedBook && (
          <motion.div
            key={addedBook.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="mt-4 flex items-center gap-3 rounded-[14px] border border-line bg-card2 p-3 shadow-paper"
          >
            <BookCover book={addedBook} width={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-medium leading-[1.35] text-ink-primary">
                {addedBook.title}
              </p>
              <p className="text-[12px] leading-[1.4] text-ink-muted">
                已加入书架 · {STATUS_OPTIONS.find((o) => o.value === addedBook.status)?.label}
              </p>
            </div>
            <Link
              to="/shelf"
              className="shrink-0 text-[13px] font-medium text-copper transition-opacity hover:opacity-70"
            >
              查看书架 →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
