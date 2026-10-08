import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { LibraryProvider } from '@/store/LibraryStore'
import { TimerUIProvider } from '@/store/TimerUI'
import { ToastProvider } from '@/components/Toast'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ToastProvider>
      <LibraryProvider>
        <TimerUIProvider>
          <App />
        </TimerUIProvider>
      </LibraryProvider>
    </ToastProvider>
  </BrowserRouter>,
)
