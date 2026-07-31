
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { initSentry } from './lib/sentry.ts'
import './index.css'

// Initialize Sentry for error tracking
initSentry();

const root = document.getElementById("root")!;
const app = (
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);

// Use hydration only if server pre-rendered HTML actually exists in the root element.
// In client-side SPA navigation where #root is an empty div shell, hydrateRoot causes
// React 18 hydration mismatch errors that corrupt the route tree and leave blank screens.
if (import.meta.env.PROD && root.hasChildNodes() && root.innerHTML.trim() !== '') {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
