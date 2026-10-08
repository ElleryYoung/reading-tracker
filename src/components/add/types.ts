/**
 * Shared types for the /add page — Google Books search results.
 */
import type { BookStatus } from '@/types'

export interface SearchResult {
  /** Google Books volume id */
  id: string
  title: string
  authors: string[]
  publisher?: string
  publishedDate?: string
  pageCount?: number
  description?: string
  categories: string[]
  coverUrl?: string
  isbn?: string
}

export interface GBookVolume {
  id: string
  volumeInfo?: {
    title?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    pageCount?: number
    description?: string
    categories?: string[]
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: { type?: string; identifier?: string }[]
  }
}

export interface OLDoc {
  key?: string
  title?: string
  author_name?: string[]
  first_publish_year?: number
  publisher?: string[]
  isbn?: string[]
  cover_i?: number
  number_of_pages_median?: number
  subject?: string[]
}

export interface OLResponse {
  docs?: OLDoc[]
}

export interface NewBookInput {
  id?: string
  title: string
  authors: string[]
  publisher?: string
  publishedDate?: string
  pageCount?: number
  coverUrl?: string
  categories: string[]
  isbn?: string
  status: BookStatus
}
