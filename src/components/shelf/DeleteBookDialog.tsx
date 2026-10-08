/**
 * DeleteBookDialog — confirm removal with record-keeping choice (shelf.md §3).
 * Options: 保留记录 / 一并删除 / 取消.
 */
import { AnimatePresence, motion } from 'framer-motion'
import type { Book } from '@/types'
import { useLibrary } from '@/store/LibraryStore'
import { useToast } from '@/components/Toast'

interface DeleteBookDialogProps {
  book: Book | null
  /** Number of sessions attached to this book */
  sessionCount: number
  onClose: () => void
}

export default function DeleteBookDialog({ book, sessionCount, onClose }: DeleteBookDialogProps) {
  const { deleteBook } = useLibrary()
  const toast = useToast()

  const remove = (keepSessions: boolean) => {
    if (!book) return
    deleteBook(book.id, { keepSessions })
    toast(keepSessions ? '已移除，阅读记录已保留' : '已从书架移除')
    onClose()
  }

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-[rgba(10,42,92,0.28)]" onClick={onClose} />
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
              从书架移除？
            </h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-secondary">
              {sessionCount > 0
                ? `同时删除该书的 ${sessionCount} 条阅读记录？`
                : '这本书还没有阅读记录，可放心移除。'}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => remove(true)}
                className="h-12 flex-1 rounded-full border-[1.5px] border-ink-primary/30 text-[15px] font-medium text-ink-primary transition-colors hover:bg-paper"
              >
                保留记录
              </button>
              <button
                type="button"
                onClick={() => remove(false)}
                className="h-12 flex-1 rounded-full bg-danger2 text-[15px] font-medium text-paper transition-opacity hover:opacity-90"
              >
                一并删除
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 h-10 w-full rounded-full text-[14px] font-medium text-ink-muted transition-colors hover:text-ink-primary"
            >
              取消
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
