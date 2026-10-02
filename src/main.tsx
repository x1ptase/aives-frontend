import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initMockApi } from './services/mocks'

// Initialize Mock API in development mode or when VITE_USE_MOCK !== 'false'
if (import.meta.env.DEV || import.meta.env.VITE_USE_MOCK !== 'false') {
  initMockApi()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
