/**
 * AddBookPage — `/add` (add-book.md).
 * Debounced Google Books search + result rows + 手动补录 manual entry.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { BookStatus } from '@/types'
import { STATUS_LABEL } from '@/types'
import { useLibrary } from '@/store/LibraryStore'
import { useToast } from '@/components/Toast'
import SearchBar from '@/components/add/SearchBar'
import ResultRow from '@/components/add/ResultRow'
import ManualEntryForm from '@/components/add/ManualEntryForm'
import type { GBookVolume, OLDoc, OLResponse, SearchResult } from '@/components/add/types'

type SearchState = 'idle' | 'loading' | 'success' | 'error'

const API_BASE = 'https://www.googleapis.com/books/v1/volumes'
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined
const KEY_PARAM = API_KEY ? `&key=${API_KEY}` : ''

function normalizeCover(url?: string): string | undefined {
  if (!url) return undefined
  let u = url.replace(/^http:\/\//, 'https://')
  if (/[?&]zoom=\d/.test(u)) u = u.replace(/([?&]zoom=)\d/, '$11')
  else u += (u.includes('?') ? '&' : '?') + 'zoom=1'
  return u
}

function toResult(v: GBookVolume): SearchResult | null {
  const info = v.volumeInfo
  if (!info?.title) return null
  const ids = info.industryIdentifiers ?? []
  const isbn =
    ids.find((x) => x.type === 'ISBN_13')?.identifier ??
    ids.find((x) => x.type === 'ISBN_10')?.identifier
  return {
    id: v.id,
    title: info.title,
    authors: info.authors ?? [],
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    pageCount: info.pageCount,
    description: info.description,
    categories: info.categories ?? [],
    coverUrl: normalizeCover(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    isbn,
  }
}

async function fetchVolumes(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const q = encodeURIComponent(query)
  try {
    // Try zh-restricted first; fall back to unrestricted when it returns nothing
    const first = await fetch(`${API_BASE}?q=${q}&maxResults=12&langRestrict=zh${KEY_PARAM}`, { signal })
    if (!first.ok) throw new Error(`HTTP ${first.status}`)
    const firstData = (await first.json()) as { items?: GBookVolume[] }
    let items = firstData.items ?? []
    if (items.length === 0) {
      const res = await fetch(`${API_BASE}?q=${q}&maxResults=12${KEY_PARAM}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { items?: GBookVolume[] }
      items = data.items ?? []
    }
    const results = items.map(toResult).filter((r): r is SearchResult => r !== null)
    if (results.length > 0) return results
  } catch (err) {
    // Aborted searches must propagate; other failures (quota, network) fall through
    // to the Open Library mirror below.
    if (err instanceof DOMException && err.name === 'AbortError') throw err
  }
  return fetchOpenLibrary(query, signal)
}

function toOlResult(d: OLDoc): SearchResult | null {
  if (!d.title || !d.key) return null
  const isbn = d.isbn?.find((x) => x.length === 13) ?? d.isbn?.[0]
  return {
    id: `ol:${d.key}`,
    title: d.title,
    authors: d.author_name ?? [],
    publisher: d.publisher?.[0],
    publishedDate: d.first_publish_year ? String(d.first_publish_year) : undefined,
    pageCount: d.number_of_pages_median,
    categories: (d.subject ?? []).slice(0, 3),
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
    isbn,
  }
}

async function fetchOpenLibrary(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const q = encodeURIComponent(query)
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${q}&limit=12&fields=key,title,author_name,first_publish_year,publisher,isbn,cover_i,number_of_pages_median,subject`,
    { signal },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as OLResponse
  return (data.docs ?? []).map(toOlResult).filter((r): r is SearchResult => r !== null)
}

function normalizeKey(s: string) {
  return s.trim().toLowerCase()
}

export default function AddBookPage() {
  const { books, addBook } = useLibrary()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>('idle')
  const [results, setResults] = useState<SearchResult[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const manualRef = useRef<HTMLDivElement>(null)

  const runSearch = useCallback(async (q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState('loading')
    try {
      const items = await fetchVolumes(q, controller.signal)
      if (controller.signal.aborted) return
      setResults(items)
      setState('success')
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError'))
        return
      setResults([])
      setState('error')
    }
  }, [])

  // Debounced auto-search while typing (450ms, min 2 chars)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      abortRef.current?.abort()
      setState('idle')
      setResults([])
      return
    }
    const timer = setTimeout(() => runSearch(q), 450)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  // Abort in-flight request on unmount
  useEffect(() => () => abortRef.current?.abort(), [])

  const shelfKeys = useMemo(() => {
    const ids = new Set(books.map((b) => b.id))
    const titleAuthor = new Set(
      books.map((b) => `${normalizeKey(b.title)}|${normalizeKey(b.authors[0] ?? '')}`),
    )
    return { ids, titleAuthor }
  }, [books])

  const inShelf = useCallback(
    (r: SearchResult) =>
      shelfKeys.ids.has(r.id) ||
      shelfKeys.titleAuthor.has(`${normalizeKey(r.title)}|${normalizeKey(r.authors[0] ?? '')}`),
    [shelfKeys],
  )

  const handleAdd = useCallback(
    (r: SearchResult, status: BookStatus) => {
      addBook({
        id: r.id,
        title: r.title,
        authors: r.authors,
        publisher: r.publisher,
        publishedDate: r.publishedDate,
        pageCount: r.pageCount,
        coverUrl: r.coverUrl,
        categories: r.categories,
        isbn: r.isbn,
        status,
      })
      toast(`已加入「${STATUS_LABEL[status]}」`)
    },
    [addBook, toast],
  )

  const scrollToManual = () => {
    manualRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const leftPane = (
    <div className="min-w-0">
      {/* Section 0 — Page header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
        className="mb-6"
      >
        <p className="label-eyebrow text-copper">添加 · ADD A BOOK</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-[1.25] text-ink-primary">
          找到你的下一本书
        </h1>
      </motion.header>

      {/* Section 1 — Search bar */}
      <SearchBar value={query} onChange={setQuery} onSubmit={runSearch} />

      {/* Section 2 — Search results */}
      <div className="mt-6">
        {state === 'loading' && (
          <div className="flex items-center justify-center gap-1.5 py-14" aria-label="搜索中">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-ink-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}

        {state === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <img
              src={`${import.meta.env.BASE_URL}illu-empty-search.png`}
              alt=""
              width={150}
              height={150}
              className="h-[150px] w-[150px] object-contain"
            />
            <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
              输入关键词，从 Google Books 搜索
            </p>
          </motion.div>
        )}

        {state === 'success' && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <img
              src={`${import.meta.env.BASE_URL}illu-empty-search.png`}
              alt=""
              width={150}
              height={150}
              className="h-[150px] w-[150px] object-contain"
            />
            <h3 className="mt-4 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
              没有找到相关书籍
            </h3>
            <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-muted">
              试试其他关键词，或者{' '}
              <button
                type="button"
                onClick={scrollToManual}
                className="font-medium text-copper underline underline-offset-2"
              >
                手动补录 ↓
              </button>
            </p>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <p className="text-[12px] leading-[1.4] text-danger2">网络异常，请稍后重试</p>
            <button
              type="button"
              onClick={() => runSearch(query.trim())}
              className="mt-3 flex h-9 items-center gap-1.5 rounded-full border border-line bg-card2 px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:border-ink-primary hover:text-ink-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              重试
            </button>
            <p className="mt-3 text-[12px] leading-[1.4] text-ink-muted">
              也可以直接使用下方
              <button
                type="button"
                onClick={scrollToManual}
                className="ml-1 font-medium text-copper underline underline-offset-2"
              >
                手动补录
              </button>
            </p>
          </motion.div>
        )}

        {state === 'success' && results.length > 0 && (
          <div className="mx-auto flex max-w-[560px] flex-col gap-3">
            {results.map((r, i) => (
              <ResultRow key={r.id} result={r} index={i} inShelf={inShelf(r)} onAdd={handleAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto w-full lg:grid lg:max-w-[1100px] lg:grid-cols-[55fr_45fr] lg:gap-12">
      {leftPane}
      {/* Section 3 — 手动补录 (sticky right pane on desktop) */}
      <div ref={manualRef} className="min-w-0 scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
        <ManualEntryForm />
      </div>

      {/* Page footer note */}
      <p className="mt-10 pb-24 text-center text-[12px] leading-[1.4] text-ink-muted lg:col-span-2">
        书目数据来自 Google Books · 保存于本地
      </p>
    </div>
  )
}
