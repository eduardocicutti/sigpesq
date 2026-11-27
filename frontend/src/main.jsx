import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
const demonstracao = import.meta.env.MODE === 'demo' || import.meta.env.VITE_MODO === 'demo'
const { default: App } = demonstracao
  ? await import('./Sigpesq.jsx')
  : await import('./ProjetosApi.jsx')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
