/**
 * Shared data model — design.md §8.
 * Persisted under the single localStorage key `reading-log-v1`.
 */

export type BookStatus = 'want' | 'reading' | 'done'

export interface Book {
  id: string // googleBooksId or `manual-`+uuid
  title: string
  authors: string[]
  publisher?: string
  publishedDate?: string
  pageCount?: number
  coverUrl?: string
  categories: string[]
  isbn?: string
  status: BookStatus
  currentPage: number
  addedAt: number
  finishedAt?: number
}

export interface Session {
  id: string
  bookId: string
  startAt: number
  endAt: number
  minutes: number // derived or manually entered
  pagesRead?: number // optional, from page-logging
  manual: boolean // true if 手动补录
}

export interface ActiveSession {
  bookId: string
  /** Timestamp of the current running segment start (when running) or of the pause moment. */
  startAt: number
  /** Milliseconds accumulated across finished segments (excludes current running segment). */
  accumulatedMs: number
  running: boolean
}

export interface StoreData {
  books: Book[]
  sessions: Session[]
  activeSession?: ActiveSession
}

export const STORAGE_KEY = 'reading-log-v1'

export const STATUS_LABEL: Record<BookStatus, string> = {
  want: '想读',
  reading: '在读',
  done: '读完',
}
