
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { initSentry } from './lib/sentry.ts'
import { initPostHog } from './lib/posthog.ts'
import './index.css'

// Initialize Sentry for error tracking
initSentry();
// Initialize product analytics (page views, retention)
initPostHog();

const root = document.getElementById("root")!;
const app = (
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);

// Hydrate only when the markup in #root was pre-rendered for *this* route.
//
// Checking `root.hasChildNodes()` was not enough. Only 13 routes are
// pre-rendered; vercel.json rewrites everything else to /index.html, which
// holds the fully pre-rendered *homepage*. So /messages, /profile, /communities
// and every admin page arrived with a populated #root full of homepage markup
// and took the hydrate path, asking React to reconcile the landing page against
// a completely different tree.
//
// React usually papers over that by re-rendering on the client, but on /messages
// it did not: the mismatch threw, ErrorBoundary caught it, and the whole app
// unmounted to a blank page that no amount of refreshing could clear.
//
// prerender.js stamps the route it generated each file for. If that is not the
// page we are on, the markup is somebody else's and we throw it away.
const prerenderedPath = document
  .querySelector<HTMLMetaElement>('meta[name="prerendered-path"]')
  ?.content;

const markupMatchesRoute =
  prerenderedPath !== undefined && prerenderedPath === window.location.pathname;

if (import.meta.env.PROD && markupMatchesRoute && root.innerHTML.trim() !== '') {
  hydrateRoot(root, app);
} else {
  // Clear first: this markup describes a different page, and leaving it in
  // place means a flash of the homepage before React paints over it.
  root.innerHTML = '';
  createRoot(root).render(app);
}
