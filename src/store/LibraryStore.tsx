/**
 * LibraryStore — single source of truth for books / sessions / activeSession.
 * Persists to localStorage under `reading-log-v1` (design.md §8).
 *
 * Usage:
 *   const { books, sessions, activeSession, addBook, ... } = useLibrary()
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { ActiveSession, Book, Session, StoreData } from '@/types'
import { STORAGE_KEY } from '@/types'

export type NewBook = Omit<Book, 'id' | 'addedAt' | 'currentPage'> & {
  id?: string
  currentPage?: number
}

export interface ManualSessionInput {
  bookId: string
  /** Start timestamp (any time of day is fine; stats bucket by start day). */
  startAt: number
  endAt?: number
  minutes: number
  pagesRead?: number
}

interface LibraryContextValue {
  books: Book[]
  sessions: Session[]
  activeSession?: ActiveSession
  /** True once the store has rehydrated from localStorage. */
  hydrated: boolean
  /** True when an activeSession existed at load (resumed after close/refresh). */
  restoredActiveSession: boolean
  getBook: (id: string) => Book | undefined
  addBook: (book: NewBook) => Book
  updateBook: (id: string, patch: Partial<Book>) => void
  /** Removes the book; sessions are deleted too unless opts.keepSessions (shelf.md delete choice). */
  deleteBook: (id: string, opts?: { keepSessions?: boolean }) => void
  startSession: (bookId: string) => void
  pauseSession: () => void
  resumeSession: () => void
  /**
   * Finish the active session and persist it. Returns the saved session,
   * or null when there is no active session / it is discarded (<1 min unless allowShort).
   */
  endSession: (opts?: { pagesRead?: number; allowShort?: boolean }) => Session | null
  /** Discard the active session without saving. */
  discardActiveSession: () => void
  /** Live elapsed milliseconds for the active session. */
  elapsedMs: (now?: number) => number
  addManualSession: (input: ManualSessionInput) => Session
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function loadData(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { books: [], sessions: [] }
    const parsed = JSON.parse(raw) as Partial<StoreData>
    return {
      books: Array.isArray(parsed.books) ? parsed.books : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      activeSession: parsed.activeSession,
    }
  } catch {
    return { books: [], sessions: [] }
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>({ books: [], sessions: [] })
  const [hydrated, setHydrated] = useState(false)
  const restoredRef = useRef(false)

  // Rehydrate on mount
  useEffect(() => {
    const loaded = loadData()
    restoredRef.current = !!loaded.activeSession
    setData(loaded)
    setHydrated(true)
  }, [])

  // Persist on change
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // storage full / unavailable — fail silently for MVP
    }
  }, [data, hydrated])

  const getBook = useCallback(
    (id: string) => data.books.find((b) => b.id === id),
    [data.books],
  )

  const addBook = useCallback((input: NewBook): Book => {
    const book: Book = {
      currentPage: 0,
      ...input,
      id: input.id ?? `manual-${uid()}`,
      addedAt: Date.now(),
    }
    setData((d) => {
      if (d.books.some((b) => b.id === book.id)) return d
      return { ...d, books: [book, ...d.books] }
    })
    return book
  }, [])

  const updateBook = useCallback((id: string, patch: Partial<Book>) => {
    setData((d) => ({
      ...d,
      books: d.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))
  }, [])

  const deleteBook = useCallback((id: string, opts?: { keepSessions?: boolean }) => {
    setData((d) => ({
      books: d.books.filter((b) => b.id !== id),
      sessions: opts?.keepSessions
        ? d.sessions
        : d.sessions.filter((s) => s.bookId !== id),
      activeSession: d.activeSession?.bookId === id ? undefined : d.activeSession,
    }))
  }, [])

  const startSession = useCallback((bookId: string) => {
    setData((d) => {
      if (d.activeSession) return d // one session at a time
      return {
        ...d,
        activeSession: { bookId, startAt: Date.now(), accumulatedMs: 0, running: true },
      }
    })
  }, [])

  const pauseSession = useCallback(() => {
    setData((d) => {
      const a = d.activeSession
      if (!a || !a.running) return d
      const now = Date.now()
      return {
        ...d,
        activeSession: {
          ...a,
          accumulatedMs: a.accumulatedMs + (now - a.startAt),
          startAt: now,
          running: false,
        },
      }
    })
  }, [])

  const resumeSession = useCallback(() => {
    setData((d) => {
      const a = d.activeSession
      if (!a || a.running) return d
      return { ...d, activeSession: { ...a, startAt: Date.now(), running: true } }
    })
  }, [])

  const elapsedMs = useCallback(
    (now = Date.now()) => {
      const a = data.activeSession
      if (!a) return 0
      return a.accumulatedMs + (a.running ? now - a.startAt : 0)
    },
    [data.activeSession],
  )

  const discardActiveSession = useCallback(() => {
    setData((d) => ({ ...d, activeSession: undefined }))
  }, [])

  const endSession = useCallback(
    (opts?: { pagesRead?: number; allowShort?: boolean }): Session | null => {
      const a = data.activeSession
      if (!a) return null
      const now = Date.now()
      const totalMs = a.accumulatedMs + (a.running ? now - a.startAt : 0)
      const minutes = Math.round(totalMs / 60000)
      if (minutes < 1 && !opts?.allowShort) {
        setData((d) => ({ ...d, activeSession: undefined }))
        return null
      }
      const session: Session = {
        id: uid(),
        bookId: a.bookId,
        startAt: now - totalMs,
        endAt: now,
        minutes: Math.max(1, minutes),
        pagesRead: opts?.pagesRead,
        manual: false,
      }
      setData((d) => ({
        ...d,
        sessions: [...d.sessions, session],
        activeSession: undefined,
        books: opts?.pagesRead
          ? d.books.map((b) =>
              b.id === a.bookId
                ? { ...b, currentPage: Math.min(b.pageCount ?? Infinity, b.currentPage + (opts.pagesRead ?? 0)) }
                : b,
            )
          : d.books,
      }))
      return session
    },
    [data.activeSession],
  )

  const addManualSession = useCallback((input: ManualSessionInput): Session => {
    const startAt = input.startAt
    const endAt = input.endAt ?? startAt + input.minutes * 60000
    const session: Session = {
      id: uid(),
      bookId: input.bookId,
      startAt,
      endAt,
      minutes: Math.max(1, Math.round(input.minutes)),
      pagesRead: input.pagesRead,
      manual: true,
    }
    setData((d) => ({
      ...d,
      sessions: [...d.sessions, session],
      books: input.pagesRead
        ? d.books.map((b) =>
            b.id === input.bookId
              ? { ...b, currentPage: Math.min(b.pageCount ?? Infinity, b.currentPage + (input.pagesRead ?? 0)) }
              : b,
          )
        : d.books,
    }))
    return session
  }, [])

  const value = useMemo<LibraryContextValue>(
    () => ({
      books: data.books,
      sessions: data.sessions,
      activeSession: data.activeSession,
      hydrated,
      restoredActiveSession: restoredRef.current,
      getBook,
      addBook,
      updateBook,
      deleteBook,
      startSession,
      pauseSession,
      resumeSession,
      endSession,
      discardActiveSession,
      elapsedMs,
      addManualSession,
    }),
    [
      data,
      hydrated,
      getBook,
      addBook,
      updateBook,
      deleteBook,
      startSession,
      pauseSession,
      resumeSession,
      endSession,
      discardActiveSession,
      elapsedMs,
      addManualSession,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within <LibraryProvider>')
  return ctx
}
