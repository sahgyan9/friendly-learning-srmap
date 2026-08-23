// Product analytics (page views, retention, funnels) — client-only, same
// PROD-gated pattern as src/lib/sentry.ts. Never runs during SSR/prerender
// because main.tsx (which calls initPostHog) is the browser entry point only;
// src/entry-server.tsx never imports it.
import posthog from "posthog-js";

export const initPostHog = () => {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!import.meta.env.PROD || !key) return;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    // Pageviews only, no screen recording — session replay is a bigger
    // privacy commitment (it can capture form text) than this pass asked
    // for. Autocapture (clicks) stays on: it's what makes "who's exploring
    // groups vs. bouncing off the mentor page" answerable without hand
    // -instrumenting every link.
    disable_session_recording: true,
    capture_pageview: true,
  });
};

// A named action beyond a page view — e.g. "mentor contacted", "group
// joined" — for events a raw pageview can't distinguish (visiting a mentor's
// profile isn't the same as messaging them).
export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  if (!import.meta.env.PROD || !import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.capture(name, properties);
};

export default posthog;
