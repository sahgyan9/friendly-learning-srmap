/**
 * Service Worker Registration Helper for Friendly Learning SRMAP.
 * Automatically registers the service worker in browser environments
 * for offline app shell caching and background sync / push notifications.
 */

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Check for updates periodically and on controller change
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New version available in background.");
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.warn("[PWA] Service worker registration failed:", error);
    return null;
  }
}
