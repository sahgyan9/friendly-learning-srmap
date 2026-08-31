import DOMPurify from "dompurify";

/**
 * Sanitizes user-authored blog HTML (Tiptap output) before it is stored, and
 * again immediately before it is rendered via dangerouslySetInnerHTML. Call
 * both — this is the first non-admin-authored HTML render surface in the
 * app, and there is no write-gateway API to enforce sanitization
 * server-side (every write goes straight from the browser to Postgres), so
 * write-time sanitization is a UX safety net, not a hard security boundary.
 * The read-time pass is what actually protects other readers regardless of
 * how a row got into the table.
 *
 * Both the html and svg profiles are needed, not a hand-narrowed
 * ALLOWED_TAGS list: KaTeX bakes its rendered equations as nested spans plus
 * <svg>/<path> for radicals and delimiters, and a narrow allowlist is
 * exactly what risks silently mangling an equation on save.
 */
export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, svg: true },
  });
}
