/**
 * SectionHeader — H2 in Fraunces + optional right caption / link (design.md §7.7).
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface SectionHeaderProps {
  title: string
  /** Right-aligned muted caption, e.g. "近 90 天" */
  caption?: string
  /** Right-aligned copper link, e.g. { label: '查看书架 ›', to: '/shelf' } */
  link?: { label: string; to: string }
  action?: ReactNode
}

export default function SectionHeader({ title, caption, link, action }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
        {title}
      </h2>
      {action}
      {link && (
        <Link
          to={link.to}
          className="label-eyebrow shrink-0 text-copper transition-opacity hover:opacity-70"
        >
          {link.label}
        </Link>
      )}
      {!link && caption && (
        <span className="label-eyebrow shrink-0 normal-case tracking-normal text-ink-muted">
          {caption}
        </span>
      )}
    </div>
  )
}
