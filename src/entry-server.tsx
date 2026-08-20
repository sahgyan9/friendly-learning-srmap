
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
// React Router 7 dropped the `react-router-dom/server` entry point; StaticRouter
// is exported from `react-router` itself now. Everything else the app uses is
// unchanged, because `react-router-dom` still re-exports the DOM bindings.
import { StaticRouter } from 'react-router';
import App from './App';

// Re-exported so prerender.js can read the head tags from the same module the
// pages use, rather than keeping a second copy of every title in a build script.
export { ROUTE_META, canonicalFor } from './lib/seo/route-meta';

// List of known routes for status code handling
const KNOWN_ROUTES = [
  '/',
  '/about',
  '/mentors',
  '/posts',
  '/workspace-groups',
  '/events',
  '/signup',
  '/signin',
  '/forgot-password',
  '/reset-password',
  '/contact',
  '/become-mentor',
  '/how-it-works',
  '/find-study-partners',
  '/hackathon-partners',
  '/blog',
  '/how-verification-works',
  '/your-data',
  '/faculty',
  '/mentor',
  '/opportunities',
  '/ask',
  '/certificate',
  '/verify',
  '/search'
];

// Private routes that should redirect if not authenticated
const PRIVATE_ROUTES = [
  '/profile',
  '/messages'
];

// Admin routes that should redirect if not admin
const ADMIN_ROUTES = [
  '/admin',
  '/admin/contact-messages',
  '/admin/mentor-verification',
  '/admin/badges',
  '/admin/settings',
  '/admin/security',
  '/admin/team-members',
  '/admin/events'
];

export function render(url: string) {
  // Determine status code based on URL
  let statusCode = 200;

  // Check if it's a known route
  const isKnownRoute = KNOWN_ROUTES.some(route => {
    if (route === '/') {
      return url === '/';
    }
    return url === route || url.startsWith(`${route}/`);
  });

  // Handle private routes
  const isPrivateRoute = PRIVATE_ROUTES.some(route => url === route || url.startsWith(`${route}/`));

  // Handle admin routes
  const isAdminRoute = ADMIN_ROUTES.some(route => url === route || url.startsWith(`${route}/`));

  // Set 404 for unknown routes
  if (!isKnownRoute && !isPrivateRoute && !isAdminRoute) {
    statusCode = 404;
  }

  // Special cases like /unauthorized should return 403
  if (url === '/unauthorized') {
    statusCode = 403;
  }

  return renderFully(url, statusCode);
}

/** How long a single page may take to settle before the build gives up on it. */
const RENDER_TIMEOUT_MS = 20_000;

/**
 * Renders a route to complete HTML, lazy routes included.
 *
 * `renderToString` cannot wait for a promise. Every page except the landing one
 * is behind `lazy()`, so it emitted the Suspense fallback and moved on — which
 * is how 12 of the 13 pre-rendered files came to ship an empty <main> while
 * still looking like a working build. It also produced markup the client could
 * not reconcile, so hydration threw React error #419 on every pre-rendered
 * route and re-rendered the page from scratch.
 *
 * `renderToPipeableStream` does wait. `onAllReady` fires once every boundary has
 * resolved, so piping from there yields the finished page in one piece, with
 * none of the fallback-swapping inline scripts that streaming to a live response
 * would produce.
 */
function renderFully(url: string, statusCode: number) {
  return new Promise<{ html: string; statusCode: number }>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let failure: unknown = null;

    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    sink.on('finish', () => {
      // A page that rendered empty is a failure worth stopping the build for.
      // Shipping it silently is the bug this function exists to fix.
      if (failure) reject(failure);
      else resolve({ html: Buffer.concat(chunks).toString('utf8'), statusCode });
    });

    const { pipe, abort } = renderToPipeableStream(
      <StaticRouter location={url}>
        <App />
      </StaticRouter>,
      {
        onAllReady() {
          clearTimeout(timer);
          pipe(sink);
        },
        // Fires for errors inside a boundary as well as fatal ones. Either way
        // the output would be incomplete, so record it and let `finish` reject.
        onError(error) {
          failure = error;
        },
        onShellError(error) {
          clearTimeout(timer);
          reject(error);
        },
      },
    );

    const timer = setTimeout(() => {
      abort();
      reject(new Error(`Timed out after ${RENDER_TIMEOUT_MS}ms pre-rendering ${url}`));
    }, RENDER_TIMEOUT_MS);
  });
}
