/**
 * Resume Parser Session Manager
 *
 * Persists resume parsing state and extracted results in sessionStorage.
 * This guarantees that if a student navigates to another page (e.g. Community, Faculty)
 * while parsing is in-flight or completed, returning to Profile Setup will seamlessly
 * recover the parsed data with a review banner instead of losing their progress.
 */

export type ParsingStage =
  | "idle"
  | "reading"
  | "analyzing"
  | "synthesizing"
  | "finalizing"
  | "success"
  | "error";

export interface ResumeParserSession {
  jobId: string;
  fileName: string;
  fileSizeBytes?: number;
  status: "idle" | "parsing" | "success" | "error";
  stage: ParsingStage;
  progressPercent: number;
  microStatus?: string;
  data?: Record<string, any>;
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
  applied: boolean;
}

const STORAGE_KEY = "fl_resume_parse_session_v1";
const EVENT_NAME = "fl:resume-parse-update";

// Check if browser storage is safely accessible
const isStorageAvailable = (): boolean => {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
};

let inMemorySession: ResumeParserSession | null = null;

export function getActiveParsingSession(): ResumeParserSession | null {
  if (inMemorySession) return inMemorySession;
  if (!isStorageAvailable()) return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeParserSession;

    // Discard sessions older than 2 hours to avoid stale popups
    const MAX_AGE_MS = 2 * 60 * 60 * 1000;
    if (Date.now() - parsed.startedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    inMemorySession = parsed;
    return parsed;
  } catch (err) {
    console.warn("Could not read resume parse session:", err);
    return null;
  }
}

export function saveParsingSession(session: ResumeParserSession): void {
  inMemorySession = session;
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.warn("Could not persist resume parse session:", err);
    }
  }

  // Broadcast update event to all active listeners in the window
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: session,
      })
    );
  }
}

export function startParsingSession(fileName: string, fileSizeBytes?: number): ResumeParserSession {
  const session: ResumeParserSession = {
    jobId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `job_${Date.now()}`,
    fileName,
    fileSizeBytes,
    status: "parsing",
    stage: "reading",
    progressPercent: 20,
    microStatus: "Extracting raw text streams & document structure...",
    startedAt: Date.now(),
    applied: false,
  };
  saveParsingSession(session);
  return session;
}

export function updateParsingProgress(
  stage: ParsingStage,
  progressPercent: number,
  microStatus?: string
): void {
  const current = getActiveParsingSession();
  if (!current) return;

  saveParsingSession({
    ...current,
    status: "parsing",
    stage,
    progressPercent,
    microStatus: microStatus || current.microStatus,
  });
}

export function completeParsingSession(data: Record<string, any>): void {
  const current = getActiveParsingSession();
  const session: ResumeParserSession = {
    jobId: current?.jobId || `job_${Date.now()}`,
    fileName: current?.fileName || "Resume.pdf",
    fileSizeBytes: current?.fileSizeBytes,
    status: "success",
    stage: "success",
    progressPercent: 100,
    microStatus: "Extraction complete!",
    data,
    startedAt: current?.startedAt || Date.now(),
    completedAt: Date.now(),
    applied: false,
  };
  saveParsingSession(session);
}

export function failParsingSession(errorMessage: string): void {
  const current = getActiveParsingSession();
  const session: ResumeParserSession = {
    jobId: current?.jobId || `job_${Date.now()}`,
    fileName: current?.fileName || "Resume.pdf",
    fileSizeBytes: current?.fileSizeBytes,
    status: "error",
    stage: "error",
    progressPercent: current?.progressPercent || 50,
    errorMessage,
    startedAt: current?.startedAt || Date.now(),
    completedAt: Date.now(),
    applied: false,
  };
  saveParsingSession(session);
}

export function markParsingSessionApplied(): void {
  const current = getActiveParsingSession();
  if (!current) return;
  saveParsingSession({
    ...current,
    applied: true,
  });
}

export function clearParsingSession(): void {
  inMemorySession = null;
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
  }
}

/**
 * Returns unapplied parsed resume data if available from a previous or background parse.
 */
export function getUnappliedParsedData(): {
  jobId: string;
  fileName: string;
  data: Record<string, any>;
  completedAt: number;
} | null {
  const session = getActiveParsingSession();
  if (
    session &&
    session.status === "success" &&
    session.data &&
    !session.applied &&
    session.completedAt
  ) {
    return {
      jobId: session.jobId,
      fileName: session.fileName,
      data: session.data,
      completedAt: session.completedAt,
    };
  }
  return null;
}

/**
 * Subscribes a React component to real-time resume parsing session changes.
 */
export function subscribeToParsingSession(
  callback: (session: ResumeParserSession | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ResumeParserSession | null>;
    callback(customEvent.detail);
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}
