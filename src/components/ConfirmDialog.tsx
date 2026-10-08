/**
 * ConfirmDialog — centered card / mobile bottom sheet (design.md §7.10).
 *
 *   <ConfirmDialog
 *     open={open}
 *     title="删除这本书？"
 *     body="相关的阅读记录也会一并删除。"
 *     confirmLabel="删除"
 *     destructive
 *     onConfirm={...}
 *     onCancel={...}
 *   />
 */
import { AnimatePresence, motion } from 'framer-motion'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = '确认',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-[rgba(10,42,92,0.28)]"
            onClick={onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-t-2xl border border-line bg-card2 p-5 shadow-paper sm:rounded-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <h2 className="font-display text-[19px] font-semibold leading-[1.3] text-ink-primary">
              {title}
            </h2>
            {body && (
              <p className="mt-2 text-[15px] leading-[1.6] text-ink-secondary">{body}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="h-12 flex-1 rounded-full border-[1.5px] border-ink-primary/30 text-[15px] font-medium text-ink-primary transition-colors hover:bg-paper"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  destructive
                    ? 'h-12 flex-1 rounded-full bg-danger2 text-[15px] font-medium text-paper transition-opacity hover:opacity-90'
                    : 'h-12 flex-1 rounded-full bg-ink-primary text-[15px] font-medium text-paper transition-opacity hover:opacity-90'
                }
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
