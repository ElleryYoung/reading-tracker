/**
 * EmptyState — centered editorial illustration + copy + pill button (design.md §7.8).
 */
import { motion } from 'framer-motion'

interface EmptyStateProps {
  image: string
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
  imageSize?: number
}

export default function EmptyState({
  image,
  title,
  body,
  actionLabel,
  onAction,
  imageSize = 160,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center py-12 text-center"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
    >
      <img
        src={image}
        alt=""
        width={imageSize}
        height={imageSize}
        style={{ width: imageSize, height: imageSize, objectFit: 'contain' }}
      />
      <h2 className="mt-4 font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
        {title}
      </h2>
      {body && (
        <p className="mt-1.5 max-w-[280px] text-[15px] leading-[1.6] text-ink-muted">{body}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-12 rounded-full bg-ink-primary px-7 text-[15px] font-medium text-paper transition-transform active:scale-[0.97]"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}
