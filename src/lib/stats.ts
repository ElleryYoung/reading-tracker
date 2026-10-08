/**
 * Derived statistics helpers — all stats derive from `sessions` + `books`.
 * See design.md §8 and stats.md.
 */
import {
  format,
  startOfDay,
  subDays,
  startOfWeek,
  addDays,
  differenceInCalendarDays,
  isSameDay,
} from 'date-fns'
import type { Book, Session } from '@/types'

export const dayKey = (ts: number) => format(ts, 'yyyy-MM-dd')

/** Heatmap bucket: 0/1–19/20–39/40–59/60+ minutes → level 0–4 */
export function heatLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0
  if (minutes < 20) return 1
  if (minutes < 40) return 2
  if (minutes < 60) return 3
  return 4
}

/** Map of yyyy-MM-dd → total minutes that day */
export function minutesByDay(sessions: Session[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const k = dayKey(s.startAt)
    map.set(k, (map.get(k) ?? 0) + s.minutes)
  }
  return map
}

export function totalMinutes(sessions: Session[]): number {
  return sessions.reduce((acc, s) => acc + s.minutes, 0)
}

export function minutesOnDay(sessions: Session[], day: Date): number {
  return sessions
    .filter((s) => isSameDay(s.startAt, day))
    .reduce((acc, s) => acc + s.minutes, 0)
}

/** Distinct days with ≥1 session minute inside the current week (Mon–Sun). */
export function activeDaysThisWeek(sessions: Session[], now = new Date()): number {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime()
  const days = new Set<string>()
  for (const s of sessions) {
    if (s.startAt >= weekStart && s.minutes > 0) days.add(dayKey(s.startAt))
  }
  return days.size
}

/** Consecutive days (ending today or yesterday) with ≥1 session minute. */
export function currentStreak(sessions: Session[], now = new Date()): number {
  const byDay = minutesByDay(sessions)
  let cursor = startOfDay(now)
  // Streak may end today or yesterday
  if (!byDay.get(dayKey(cursor.getTime()))) {
    cursor = subDays(cursor, 1)
    if (!byDay.get(dayKey(cursor.getTime()))) return 0
  }
  let streak = 0
  while (byDay.get(dayKey(cursor.getTime()))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }
  return streak
}

export function longestStreak(sessions: Session[]): number {
  const byDay = minutesByDay(sessions)
  const days = Array.from(byDay.keys()).sort()
  if (days.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T00:00:00')
    const cur = new Date(days[i] + 'T00:00:00')
    if (differenceInCalendarDays(cur, prev) === 1) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

export function averageSessionMinutes(sessions: Session[]): number {
  if (sessions.length === 0) return 0
  return Math.round(totalMinutes(sessions) / sessions.length)
}

export interface WeekBucket {
  label: string
  minutes: number
  start: number
}

/** Last 4 ISO weeks (Mon–Sun), oldest → newest; last bucket is the current week. */
export function lastFourWeeks(sessions: Session[], now = new Date()): WeekBucket[] {
  const labels = ['3周前', '2周前', '上周', '本周']
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const buckets: WeekBucket[] = []
  for (let i = 3; i >= 0; i--) {
    const start = subDays(thisWeekStart, i * 7)
    const end = addDays(start, 7)
    const minutes = sessions
      .filter((s) => s.startAt >= start.getTime() && s.startAt < end.getTime())
      .reduce((acc, s) => acc + s.minutes, 0)
    buckets.push({ label: labels[3 - i], minutes, start: start.getTime() })
  }
  return buckets
}

export interface TopBookEntry {
  book: Book
  minutes: number
  count: number
}

/** Top books by total reading minutes. */
export function topBooks(books: Book[], sessions: Session[], n = 5): TopBookEntry[] {
  const byId = new Map(books.map((b) => [b.id, b]))
  const agg = new Map<string, { minutes: number; count: number }>()
  for (const s of sessions) {
    if (!byId.has(s.bookId)) continue
    const cur = agg.get(s.bookId) ?? { minutes: 0, count: 0 }
    cur.minutes += s.minutes
    cur.count += 1
    agg.set(s.bookId, cur)
  }
  return Array.from(agg.entries())
    .map(([bookId, v]) => ({ book: byId.get(bookId)!, ...v }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, n)
}

export interface CategoryEntry {
  name: string
  count: number
}

/** Top 6 categories; 7th+ collapse into 其他. */
export function categoryDistribution(books: Book[], top = 6): CategoryEntry[] {
  const counts = new Map<string, number>()
  for (const b of books) {
    for (const c of b.categories) {
      const name = c.trim()
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  const sorted = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  if (sorted.length <= top) return sorted
  const head = sorted.slice(0, top)
  const rest = sorted.slice(top).reduce((acc, e) => acc + e.count, 0)
  return [...head, { name: '其他', count: rest }]
}

export interface StatusCounts {
  want: number
  reading: number
  done: number
  total: number
}

export function statusCounts(books: Book[]): StatusCounts {
  const c: StatusCounts = { want: 0, reading: 0, done: 0, total: books.length }
  for (const b of books) c[b.status] += 1
  return c
}

/** Most recent sessions, newest first. */
export function recentSessions(sessions: Session[], n = 5): Session[] {
  return [...sessions].sort((a, b) => b.startAt - a.startAt).slice(0, n)
}

/** Heatmap grid model: 13 week-columns × 7 weekday-rows (Monday top), ending this week. */
export interface HeatCell {
  date: Date
  key: string
  minutes: number
  level: 0 | 1 | 2 | 3 | 4
  isToday: boolean
  inRange: boolean // within the last 90 days (cells before that are padding)
}

export function buildHeatmap(sessions: Session[], days = 90, now = new Date()) {
  const byDay = minutesByDay(sessions)
  const today = startOfDay(now)
  const rangeStart = subDays(today, days - 1)
  // Grid starts on the Monday of the week containing rangeStart
  const gridStart = startOfWeek(rangeStart, { weekStartsOn: 1 })
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weeks: HeatCell[][] = []
  let cursor = gridStart
  while (cursor <= thisWeekStart) {
    const col: HeatCell[] = []
    for (let r = 0; r < 7; r++) {
      const date = addDays(cursor, r)
      const inRange = date >= rangeStart && date <= today
      const future = date > today
      const minutes = future ? 0 : (byDay.get(dayKey(date.getTime())) ?? 0)
      col.push({
        date,
        key: dayKey(date.getTime()),
        minutes,
        level: heatLevel(minutes),
        isToday: isSameDay(date, today),
        inRange,
      })
    }
    weeks.push(col)
    cursor = addDays(cursor, 7)
  }
  return weeks
}

/** Month labels aligned above the first week column that starts each month. */
export function heatmapMonthLabels(weeks: HeatCell[][]): { col: number; label: string }[] {
  const labels: { col: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((col, i) => {
    // Use the first in-range day of the column
    const first = col.find((c) => c.inRange) ?? col[0]
    const m = first.date.getMonth()
    if (m !== lastMonth) {
      labels.push({ col: i, label: format(first.date, 'M月') })
      lastMonth = m
    }
  })
  return labels
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}分钟`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h}小时` : `${h}小时${m}分`
}

/** mm:ss or h:mm:ss */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
