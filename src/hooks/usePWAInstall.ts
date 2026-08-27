import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/posthog";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global variable to capture beforeinstallprompt even before hook mounts
let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pwa-prompt-available"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("pwa-installed"));
  });
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const key = "fl_pwa_device_id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "dev_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

function getPlatformName(isIOS: boolean): string {
  if (typeof window === "undefined") return "unknown";
  if (isIOS) return "ios";
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "other";
}

async function recordPwaInstall(platform: string, method: string) {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return;

  // 1. PostHog Event Track
  try {
    trackEvent("pwa_installed", {
      platform,
      method,
      device_id: deviceId,
    });
  } catch (err) {
    console.warn("[usePWAInstall] PostHog tracking error:", err);
  }

  // 2. Supabase Database Record
  try {
    const { error } = await (supabase.rpc as any)("record_pwa_install", {
      p_device_id: deviceId,
      p_platform: platform,
    });
    if (error) {
      console.warn("[usePWAInstall] Supabase record error:", error);
    } else {
      localStorage.setItem("fl_pwa_install_recorded", "true");
    }
  } catch (err) {
    console.warn("[usePWAInstall] Error recording install:", err);
  }
}

async function recordPwaActivePing(platform: string) {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const lastPing = localStorage.getItem("fl_pwa_last_active_ping");
    if (lastPing === today) return;

    await (supabase.rpc as any)("record_pwa_install", {
      p_device_id: deviceId,
      p_platform: platform,
    });
    localStorage.setItem("fl_pwa_last_active_ping", today);
    trackEvent("pwa_standalone_active", { platform });
  } catch {
    // Non-critical background ping
  }
}

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState<boolean>(Boolean(deferredPrompt));
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  const [isIOS, setIsIOS] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  });

  useEffect(() => {
    const handlePromptAvailable = () => {
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      recordPwaInstall(getPlatformName(isIOS), "browser_event");
    };

    window.addEventListener("pwa-prompt-available", handlePromptAvailable);
    window.addEventListener("pwa-installed", handleInstalled);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
      window.removeEventListener("pwa-installed", handleInstalled);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [isIOS]);

  // Track standalone launches (iOS Add to Home Screen & App launches)
  useEffect(() => {
    if (isInstalled) {
      const platform = getPlatformName(isIOS);
      let alreadyRecorded = false;
      try {
        alreadyRecorded = localStorage.getItem("fl_pwa_install_recorded") === "true";
      } catch {
        // Ignore storage errors
      }

      if (!alreadyRecorded) {
        recordPwaInstall(platform, isIOS ? "ios_home_screen" : "standalone_launch");
      }
      recordPwaActivePing(platform);
    }
  }, [isInstalled, isIOS]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        deferredPrompt = null;
        setIsInstallable(false);
        recordPwaInstall(getPlatformName(isIOS), "prompt_accepted");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[usePWAInstall] Error triggering install prompt:", err);
      return false;
    }
  }, [isIOS]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
