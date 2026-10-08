/**
 * StatsPage — `/` dashboard (stats.md). All data derives from sessions + books.
 */
import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  Cell as PieCell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, CheckCircle2, Clock, Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { useLibrary } from '@/store/LibraryStore'
import { useTimerUI } from '@/store/TimerUI'
import SectionHeader from '@/components/SectionHeader'
import StatCard from '@/components/StatCard'
import { BookCover } from '@/components/BookCard'
import HeatmapCalendar from '@/components/stats/HeatmapCalendar'
import {
  activeDaysThisWeek,
  averageSessionMinutes,
  categoryDistribution,
  currentStreak,
  formatMinutes,
  lastFourWeeks,
  longestStreak,
  minutesOnDay,
  recentSessions,
  statusCounts,
  topBooks,
  totalMinutes,
} from '@/lib/stats'
import type { BookStatus } from '@/types'
import { STATUS_LABEL } from '@/types'

const EASE = [0.33, 1, 0.68, 1] as [number, number, number, number]
const CATEGORY_FILLS = ['#0A2A5C', '#5E7FAE', '#93ABCB', '#A09070', '#C9BBA0', '#7A8B6F']
const STATUS_FILL: Record<BookStatus, string> = {
  want: '#A09070',
  reading: '#5E7FAE',
  done: '#0A2A5C',
}

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.45, delay, ease: EASE },
})

export default function StatsPage() {
  const { books } = useLibrary()

  return (
    <div className="mx-auto w-full max-w-none lg:max-w-[720px]">
      <HeaderBanner />
      <div className="mt-8 space-y-8 lg:mt-12 lg:space-y-12">
        <StatCardsSection />
        <motion.section {...rise()}>
          <SectionHeader title="每日阅读" caption="近 90 天" />
          <HeatmapCalendar />
        </motion.section>
        <CompositionSection books={books} />
        <div className="grid gap-8 lg:grid-cols-[55fr_45fr] lg:gap-6">
          <WeeklySection />
          <Top5Section />
        </div>
        <RecentSessionsSection />
      </div>
    </div>
  )
}

/* ============================== Section 0 — Header ============================== */

function HeaderBanner() {
  const { sessions } = useLibrary()
  const { openTimer } = useTimerUI()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  const todayMin = minutesOnDay(sessions, new Date())
  const weekDays = activeDaysThisWeek(sessions)
  const hasSessions = sessions.length > 0

  return (
    <section className="grid items-center gap-5 lg:grid-cols-[60fr_40fr]">
      <div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="label-eyebrow text-copper"
        >
          阅读记录 · READING LOG
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: EASE }}
          className="mt-2 font-display text-[26px] font-semibold leading-[1.25] text-ink-primary"
        >
          {greeting}，今天读书了吗？
        </motion.h1>
        {hasSessions ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-2 text-[15px] leading-[1.6] text-ink-muted"
          >
            {todayMin > 0
              ? `今天已读 ${todayMin} 分钟 · 本周第 ${weekDays} 天`
              : `本周已读 ${weekDays} 天 · 今天还没开始`}
          </motion.p>
        ) : (
          <motion.button
            type="button"
            onClick={() => openTimer()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-2 text-[15px] leading-[1.6] text-copper transition-opacity hover:opacity-70"
          >
            开始你的第一段阅读吧 →
          </motion.button>
        )}
      </div>
      <motion.div
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        className="overflow-hidden rounded border border-line"
      >
        <img
          src={`${import.meta.env.BASE_URL}illu-hero-stats.png`}
          alt=""
          className="max-h-[140px] w-full object-cover lg:max-h-[180px]"
        />
      </motion.div>
    </section>
  )
}

/* ============================== Section 1 — Stat cards ============================== */

function StatCardsSection() {
  const { books, sessions } = useLibrary()
  const total = totalMinutes(sessions)
  const streak = currentStreak(sessions)
  const longest = longestStreak(sessions)
  const avg = averageSessionMinutes(sessions)
  const done = books.filter((b) => b.status === 'done').length

  const hoursMode = total >= 120
  const cards = [
    {
      eyebrow: '累计总时长',
      value: hoursMode ? Math.round((total / 60) * 10) / 10 : total,
      decimals: hoursMode ? 1 : 0,
      unit: hoursMode ? '小时' : '分钟',
      caption: `共 ${sessions.length} 个阅读时段`,
      icon: <Clock strokeWidth={1.5} />,
    },
    {
      eyebrow: '连续阅读',
      value: streak,
      decimals: 0,
      unit: '天',
      caption: streak >= 1 ? `最长纪录 ${longest} 天` : '今天开始第一段吧',
      icon: streak >= 1 ? <FlameLoop /> : <Flame strokeWidth={1.5} />,
    },
    {
      eyebrow: '平均时长',
      value: avg,
      decimals: 0,
      unit: '分钟',
      caption: '每个阅读时段平均',
      icon: <Activity strokeWidth={1.5} />,
    },
    {
      eyebrow: '读完书籍',
      value: done,
      decimals: 0,
      unit: '本',
      caption: `书架共 ${books.length} 本`,
      icon: <CheckCircle2 strokeWidth={1.5} />,
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {cards.map((c, i) => (
        <motion.div key={c.eyebrow} {...rise(i * 0.08)}>
          <StatCard {...c} />
        </motion.div>
      ))}
    </section>
  )
}

/** Subtle 3s breathing flame — isolated + memoized per perf rules. */
const FlameLoop = memo(function FlameLoop() {
  return (
    <motion.span
      className="inline-flex"
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Flame strokeWidth={1.5} fill="currentColor" className="h-5 w-5" />
    </motion.span>
  )
})

/* ============================== Section 3 — Composition ============================== */

function CompositionSection({ books }: { books: import('@/types').Book[] }) {
  const counts = statusCounts(books)
  const cats = useMemo(() => categoryDistribution(books, 6), [books])
  const maxCat = cats.length > 0 ? cats[0].count : 0
  const pieData = (['want', 'reading', 'done'] as BookStatus[]).map((s) => ({
    name: STATUS_LABEL[s],
    status: s,
    value: counts[s],
  }))

  return (
    <motion.section {...rise()}>
      <SectionHeader title="书架构成" />
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card A — status donut */}
        <div className="rounded-[14px] border border-line bg-card2 p-5 shadow-paper">
          <p className="label-eyebrow text-ink-muted">状态统计</p>
          <div className="mt-4 flex justify-center">
            <div className="relative h-[180px] w-[180px]">
              {counts.total > 0 ? (
                <PieChart width={180} height={180}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius="62%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    stroke="#FDFBF5"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  >
                    {pieData.map((d) => (
                      <PieCell key={d.status} fill={STATUS_FILL[d.status]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <div className="h-full w-full rounded-full border-[14px] border-heat-0" />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="tnum font-display text-[28px] font-semibold leading-[1.1] text-ink-primary">
                  {counts.total}
                </span>
                <span className="text-[12px] leading-[1.4] text-ink-muted">本书</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((d, i) => (
              <motion.div
                key={d.status}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: EASE }}
              >
                <Link
                  to={`/shelf?status=${d.status}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-paper"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-[3px]"
                    style={{ backgroundColor: STATUS_FILL[d.status] }}
                  />
                  <span className="flex-1 text-[15px] leading-[1.6] text-ink-secondary">
                    {d.name}
                  </span>
                  <span className="tnum text-[15px] text-ink-secondary">{d.value}</span>
                  <span className="tnum w-10 text-right text-[12px] leading-[1.4] text-ink-muted">
                    {counts.total > 0 ? `${Math.round((d.value / counts.total) * 100)}%` : '—'}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Card B — category bars */}
        <div className="rounded-[14px] border border-line bg-card2 p-5 shadow-paper">
          <p className="label-eyebrow text-ink-muted">类别分布</p>
          {cats.length === 0 ? (
            <p className="mt-6 text-[12px] leading-[1.4] text-ink-muted">
              添加书籍时将自动读取分类
            </p>
          ) : (
            <div className="mt-4 space-y-3.5">
              {cats.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-[72px] shrink-0 truncate text-right text-[15px] leading-[1.6] text-ink-secondary">
                    {c.name}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-heat-0">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: CATEGORY_FILLS[i % CATEGORY_FILLS.length] }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(c.count / maxCat) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
                    />
                  </div>
                  <span className="tnum w-6 text-right text-[12px] leading-[1.4] text-ink-muted">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

/* ============================== Section 4 — Weekly bars ============================== */

function WeeklySection() {
  const { sessions } = useLibrary()
  const weeks = useMemo(() => lastFourWeeks(sessions), [sessions])
  const thisWeek = weeks[3].minutes
  const lastWeek = weeks[2].minutes
  const diff = thisWeek - lastWeek

  return (
    <motion.section {...rise()}>
      <SectionHeader title="近 4 周" caption="每周总分钟" />
      <div className="rounded-[14px] border border-line bg-card2 p-5 shadow-paper">
        <BarChart width={undefined as unknown as number} height={0} data={[]} style={{ display: 'none' }} />
        <WeeklyChart data={weeks} />
        {diff !== 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-3 flex items-center gap-1.5 text-[15px] leading-[1.6] text-ink-muted"
          >
            {diff > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-sage" strokeWidth={1.5} />
                本周比上周多读 {diff} 分钟
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
                本周比上周少读 {-diff} 分钟
              </>
            )}
          </motion.p>
        )}
      </div>
    </motion.section>
  )
}

function WeeklyChart({ data }: { data: { label: string; minutes: number }[] }) {
  const [size, setSize] = useState<{ w: number }>({ w: 0 })
  return (
    <div
      ref={(el) => {
        if (el && el.clientWidth !== size.w) setSize({ w: el.clientWidth })
      }}
      className="w-full"
    >
      {size.w > 0 && (
        <BarChart
          width={size.w}
          height={180}
          data={data}
          margin={{ top: 18, right: 4, bottom: 0, left: 4 }}
          barCategoryGap="32%"
        >
          <XAxis
            dataKey="label"
            axisLine={{ stroke: '#D9D2C2', strokeWidth: 1 }}
            tickLine={false}
            tick={{ fill: '#8A8FA3', fontSize: 12 }}
            tickMargin={8}
          />
          <YAxis hide domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.15))]} />
          <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive animationDuration={650}>
            {data.map((d, i) => (
              <PieCell key={d.label} fill={i === data.length - 1 ? '#0A2A5C' : '#5E7FAE'} />
            ))}
            <LabelList dataKey="minutes" content={<WeekBarLabel isLastIndex={data.length - 1} />} />
          </Bar>
        </BarChart>
      )}
    </div>
  )
}

function WeekBarLabel(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: number | string
  index?: number
  isLastIndex?: number
}) {
  const { x = 0, y = 0, width = 0, value = 0, index = 0, isLastIndex = 0 } = props
  const cx = Number(x) + Number(width) / 2
  const isLast = index === isLastIndex
  return (
    <g>
      {isLast && <circle cx={cx} cy={Number(y) - 14} r={3} fill="#A09070" />}
      <text
        x={cx}
        y={Number(y) - 4}
        textAnchor="middle"
        fill="#8A8FA3"
        fontSize={12}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </text>
    </g>
  )
}

/* ============================== Section 5 — Top 5 ============================== */

function Top5Section() {
  const { books, sessions } = useLibrary()
  const top = useMemo(() => topBooks(books, sessions, 5), [books, sessions])
  const max = top.length > 0 ? top[0].minutes : 0

  return (
    <motion.section {...rise()}>
      <SectionHeader title="单书投入" link={{ label: '查看书架 ›', to: '/shelf' }} />
      <div className="rounded-[14px] border border-line bg-card2 p-5 shadow-paper">
        {top.length === 0 ? (
          <p className="py-3 text-[15px] leading-[1.6] text-ink-muted">
            计时后即可看到每本书的投入排行
          </p>
        ) : (
          <div className="space-y-4">
            {top.map((t, i) => (
              <motion.div
                key={t.book.id}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                className="flex items-start gap-3"
              >
                <span
                  className={`tnum mt-1 w-5 shrink-0 font-display text-[20px] font-semibold leading-none ${
                    i === 0 ? 'text-copper' : 'text-ink-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <BookCover book={t.book} width={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="line-clamp-2 font-display text-[15px] font-medium leading-[1.35] text-ink-primary">
                      {t.book.title}
                    </p>
                    <div className="shrink-0 text-right">
                      <span className="tnum text-[15px] font-semibold text-ink-primary">
                        {formatMinutes(t.minutes)}
                      </span>
                      <span className="ml-1.5 text-[12px] leading-[1.4] text-ink-muted">
                        {t.count} 次
                      </span>
                    </div>
                  </div>
                  <p className="truncate text-[12px] leading-[1.4] text-ink-muted">
                    {t.book.authors.join('、') || '未知作者'}
                  </p>
                  <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-heat-0">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: i === 0 ? '#0A2A5C' : '#5E7FAE' }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(t.minutes / max) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: EASE }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  )
}

/* ============================== Section 6 — Recent sessions ============================== */

function RecentSessionsSection() {
  const { sessions, getBook } = useLibrary()
  const [expanded, setExpanded] = useState(false)
  const rows = useMemo(
    () => recentSessions(sessions, expanded ? 30 : 5),
    [sessions, expanded],
  )

  if (sessions.length === 0) return null

  return (
    <motion.section {...rise()}>
      <SectionHeader title="最近阅读时段" />
      <div className="rounded-[14px] border border-line bg-card2 p-5 shadow-paper">
        <div className="divide-y divide-line/70">
          <AnimatePresence initial={false}>
            {rows.map((s, i) => {
              const book = getBook(s.bookId)
              const d = new Date(s.startAt)
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.3, ease: EASE }}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="w-[92px] shrink-0">
                    <p className="text-[15px] font-semibold leading-[1.3] text-ink-primary">
                      {d.getMonth() + 1}月{d.getDate()}日
                    </p>
                    <p className="tnum text-[12px] leading-[1.4] text-ink-muted">
                      {fmtHM(s.startAt)}–{fmtHM(s.endAt)}
                    </p>
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[15px] leading-[1.6] text-ink-secondary">
                    {book?.title ?? '已删除的书籍'}
                  </p>
                  {s.manual && (
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-copper-soft/50 text-[10px] font-medium text-copper">
                      补
                    </span>
                  )}
                  <span className="tnum shrink-0 rounded-full bg-heat-1 px-2.5 py-1 text-[12px] font-medium text-ink-primary">
                    {s.minutes}分钟
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
        {sessions.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="label-eyebrow mt-4 w-full text-center text-copper transition-opacity hover:opacity-70"
          >
            {expanded ? '收起 ↑' : '全部记录 ›'}
          </button>
        )}
      </div>
    </motion.section>
  )
}

function fmtHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
