/**
 * SegmentedControl — sliding deep-blue pill indicator (design.md §7.5).
 *
 *   <SegmentedControl
 *     options={[{ value: 'all', label: '全部' }, ...]}
 *     value={filter}
 *     onChange={setFilter}
 *   />
 */
import { motion } from 'framer-motion'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** layoutId namespace — required when more than one instance is on screen */
  id?: string
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  id = 'segmented',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className="flex rounded-full border border-line bg-card2 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
              active ? 'text-paper' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-full bg-ink-primary"
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
