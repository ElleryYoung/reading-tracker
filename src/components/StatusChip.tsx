/**
 * StatusChip — 999px pill, 22px height (design.md §7.5).
 */
import type { BookStatus } from '@/types'
import { STATUS_LABEL } from '@/types'

const STYLES: Record<BookStatus, string> = {
  want: 'bg-copper-soft/60 text-copper',
  reading: 'bg-heat-2/60 text-ink-primary',
  done: 'bg-ink-primary text-paper',
}

export default function StatusChip({ status }: { status: BookStatus }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium leading-none ${STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
