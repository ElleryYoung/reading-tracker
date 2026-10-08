/**
 * Navbar — bottom tab bar (mobile) / top nav (desktop ≥1024px), design.md §7.1.
 * Mobile bar is `fixed bottom-0`; Layout owns the matching content padding.
 */
import { NavLink, Link, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { BarChart3, Library, Plus } from 'lucide-react'

const TABS = [
  { to: '/', label: '统计', icon: BarChart3 },
  { to: '/shelf', label: '书架', icon: Library },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <>
      {/* ---- Mobile bottom tab bar ---- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card2 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative grid h-16 grid-cols-3">
          {TABS.map((tab) => {
            const active = pathname === tab.to
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="relative flex flex-col items-center justify-center gap-0.5"
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    active ? 'text-ink-primary' : 'text-ink-muted'
                  }`}
                  strokeWidth={1.5}
                />
                <span
                  className={`text-[11px] font-medium leading-[1.2] transition-colors duration-200 ${
                    active ? 'text-ink-primary' : 'text-ink-muted'
                  }`}
                >
                  {tab.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute bottom-1.5 h-[2px] w-6 rounded-full bg-copper"
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  />
                )}
              </NavLink>
            )
          })}
          {/* 添加 — raised filled circle */}
          <div className="relative flex items-start justify-center">
            <NavLink
              to="/add"
              aria-label="添加书籍"
              className="absolute -top-2 flex h-11 w-11 items-center justify-center rounded-full bg-ink-primary text-paper shadow-paper transition-transform active:scale-95"
            >
              <Plus className="h-5 w-5" strokeWidth={2} />
            </NavLink>
            <span
              className={`mt-9 text-[11px] font-medium leading-[1.2] ${
                pathname === '/add' ? 'text-ink-primary' : 'text-ink-muted'
              }`}
            >
              添加
            </span>
          </div>
        </div>
      </nav>

      {/* ---- Desktop top nav ---- */}
      <header className="sticky top-0 z-50 hidden border-b border-line bg-card2/90 backdrop-blur-sm lg:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" className="h-7 w-7" />
            <span className="font-display text-[18px] font-semibold text-ink-primary">
              阅读记录 · Reading Log
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = pathname === tab.to
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`relative rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
                    active ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-primary'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="topnav-underline"
                      className="absolute inset-x-4 -bottom-[1px] h-[2px] rounded-full bg-copper"
                      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    />
                  )}
                </NavLink>
              )
            })}
            <NavLink
              to="/add"
              className="ml-3 flex h-10 items-center gap-1.5 rounded-full bg-ink-primary px-4 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              添加书籍
            </NavLink>
          </nav>
        </div>
      </header>
    </>
  )
}
