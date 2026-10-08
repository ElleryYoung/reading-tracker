/**
 * Layout — shared shell. Owns nav offsets: pages must NOT compensate for
 * the bottom tab bar or floating timer pill (react-dev.md layout contract).
 *
 * Content column: full-width + 20px padding mobile; 560px centered ≥768px;
 * pages that need 720px (stats) can opt out inside the page.
 */
import { Outlet } from 'react-router'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TimerPill from '@/components/timer/TimerPill'
import TimerSheet from '@/components/timer/TimerSheet'

export default function Layout() {
  return (
    <div className="min-h-[100dvh] bg-paper">
      <Navbar />
      {/* pb clears the 64px tab bar + raised add button + 76px-high timer pill zone */}
      <main className="mx-auto w-full px-5 pb-[150px] pt-6 md:max-w-[560px] lg:max-w-none lg:px-8 lg:pb-16 lg:pt-8">
        <Outlet />
        <Footer />
      </main>
      <TimerPill />
      <TimerSheet />
    </div>
  )
}
