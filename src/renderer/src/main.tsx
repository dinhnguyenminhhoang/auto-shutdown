import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { webMockApi } from './web-mock'

if (typeof window !== 'undefined' && !window.api) {
  window.api = webMockApi
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
