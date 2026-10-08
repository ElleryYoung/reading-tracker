/**
 * CountUp — animates 0 → value over 800ms ease-out when scrolled into view.
 * Respects prefers-reduced-motion (design.md §6).
 */
import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  decimals?: number
  duration?: number
  className?: string
}

export default function CountUp({ value, decimals = 0, duration = 800, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplay(value)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return
        started.current = true
        const t0 = performance.now()
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay(value * eased)
          if (p < 1) requestAnimationFrame(tick)
          else setDisplay(value)
        }
        requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className={`tnum ${className ?? ''}`}>
      {display.toFixed(decimals)}
    </span>
  )
}
