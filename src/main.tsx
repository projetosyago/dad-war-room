import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App'
import { AdminModeProvider } from './contexts/AdminModeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdminModeProvider>
        <App />
      </AdminModeProvider>
    </BrowserRouter>
  </StrictMode>,
)
