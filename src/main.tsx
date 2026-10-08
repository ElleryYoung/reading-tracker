import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { LibraryProvider } from '@/store/LibraryStore'
import { TimerUIProvider } from '@/store/TimerUI'
import { ToastProvider } from '@/components/Toast'

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <ToastProvider>
      <LibraryProvider>
        <TimerUIProvider>
          <App />
        </TimerUIProvider>
      </LibraryProvider>
    </ToastProvider>
  </HashRouter>,
)
