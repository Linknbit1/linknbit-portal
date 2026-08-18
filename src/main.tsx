import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { registerServiceWorker } from './pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Last resort. The shells carry their own boundary so navigation survives a
        broken page; this one only catches a failure above the router, where
        there is no chrome left to keep. */}
    <ErrorBoundary variant="page" label="The portal">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

registerServiceWorker()
