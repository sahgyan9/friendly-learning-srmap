/**
 * Unified Haptics Engine for Mobile, Tablet, and PWA environments.
 *
 * Provides physical vibration patterns on Android & Chromium devices via the
 * Web Vibration API, with safe fallbacks and micro-tactile sound cues on iOS Safari / iPadOS
 * where WebKit restricts navigator.vibrate.
 */

export type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

// Vibration durations in milliseconds
const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 12, // Crisp subtle tick (e.g. threshold crossed)
  selection: 8, // Very light UI selection
  medium: 22, // Solid button tap / release trigger
  heavy: 38, // Prominent action impact
  success: [12, 45, 18], // Double pulse confirmation
  warning: [25, 40, 25], // Double buzz
  error: [35, 40, 35, 40, 45], // Triple urgent buzz
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Generates an ultra-subtle, barely-audible micro-click (50-80Hz damped sine wave)
 * on iOS devices to mimic tactile physical feedback when navigator.vibrate is unavailable.
 */
function playTactileMicroClick(type: HapticType) {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== "running") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const freq = type === "heavy" ? 65 : type === "medium" ? 80 : 100;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.03);

    const volume = type === "heavy" ? 0.04 : type === "medium" ? 0.03 : 0.02;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Non-critical fallback; silently ignore if audio is blocked
  }
}

/**
 * Triggers haptic feedback based on the specified intensity or pattern.
 */
export function triggerHaptic(type: HapticType = "light"): boolean {
  if (typeof window === "undefined") return false;

  const hasVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  if (hasVibrate) {
    try {
      const pattern = VIBRATION_PATTERNS[type];
      return navigator.vibrate(pattern);
    } catch {
      // Fallback if vibrate threw security or permission error
    }
  }

  // iOS WebKit fallback: micro tactile audio click
  playTactileMicroClick(type);
  return false;
}

/**
 * Checks if the Web Vibration API is supported on the current device/browser.
 */
export function isHapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
