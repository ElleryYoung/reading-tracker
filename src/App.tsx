import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import StatsPage from '@/pages/StatsPage'
import ShelfPage from '@/pages/ShelfPage'
import AddPage from '@/pages/AddPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<StatsPage />} />
        <Route path="shelf" element={<ShelfPage />} />
        <Route path="add" element={<AddPage />} />
        <Route path="*" element={<StatsPage />} />
      </Route>
    </Routes>
  )
}
