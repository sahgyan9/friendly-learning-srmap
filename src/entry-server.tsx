
import ReactDOMServer from 'react-dom/server';
// React Router 7 dropped the `react-router-dom/server` entry point; StaticRouter
// is exported from `react-router` itself now. Everything else the app uses is
// unchanged, because `react-router-dom` still re-exports the DOM bindings.
import { StaticRouter } from 'react-router';
import App from './App';

// List of known routes for status code handling
const KNOWN_ROUTES = [
  '/',
  '/about',
  '/mentors',
  '/community-posts',
  '/signup',
  '/signin',
  '/contact',
  '/marketplace',
  '/become-mentor',
  '/how-it-works',
  '/find-study-partners',
  '/hackathon-partners',
  '/blog'
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

  const html = ReactDOMServer.renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  );

  return { html, statusCode };
}
