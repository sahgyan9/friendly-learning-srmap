/**
 * Extracts a human-readable message from a `catch` value typed `unknown`.
 * Supabase/Postgrest errors and native Errors both carry `.message`; anything
 * else (a thrown string, a rejected non-Error) falls back.
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string" && error) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

/** Reads a string field off an unknown catch value without assuming its shape. */
export function getErrorField(error: unknown, field: string): string | undefined {
  if (typeof error !== "object" || error === null || !(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}
