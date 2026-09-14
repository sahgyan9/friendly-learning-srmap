// Response helpers shared by the edge functions.
//
// Before this file every function carried its own copy of the CORS header
// block and a json() helper (19 and 13 copies respectively). Functions move
// onto it when they are next edited and redeployed; do not mass-migrate
// untouched functions, because an edited file is not the deployed function
// until it is redeployed, and a repo that drifts from production is worse than
// a little duplication.

const BASE_ALLOWED_HEADERS = ["authorization", "x-client-info", "apikey", "content-type"];

/** CORS headers. Pass any extra request headers the function reads. */
export function corsHeaders(extraAllowedHeaders: string[] = []): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": [...BASE_ALLOWED_HEADERS, ...extraAllowedHeaders].join(", "),
  };
}

/** JSON response with CORS headers attached. */
export function json(body: unknown, status = 200, cors: Record<string, string> = corsHeaders()): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Constant-time string comparison, so a secret check does not leak its length or prefix through timing. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * True when the request carries the project's CRON_SECRET in `x-cron-secret`.
 * Fails closed: an unset CRON_SECRET never matches, and there is deliberately
 * no fallback value. The repo is public, so any literal here would be a
 * published password.
 */
export function isCronCaller(req: Request): boolean {
  return safeEqual(req.headers.get("x-cron-secret"), Deno.env.get("CRON_SECRET"));
}
