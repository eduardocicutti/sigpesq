import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
const { default: App } = import.meta.env.VITE_MODO === 'api'
  ? await import('./ProjetosApi.jsx')
  : await import('./Sigpesq.jsx')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
