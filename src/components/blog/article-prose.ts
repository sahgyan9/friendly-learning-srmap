/**
 * Article typography shared by the editor canvas, the writer's preview and the
 * public reading page, so what an author sees while writing is what readers
 * get. Kept as one string because Tailwind needs the full class names
 * statically present in source.
 *
 * Figure alignment classes are emitted by the BlogImage node's renderHTML
 * (`blog-figure-left|center|full`) and have no stylesheet of their own, so
 * they are styled here.
 */
export const ARTICLE_PROSE = [
  "prose prose-neutral dark:prose-invert max-w-none",
  "text-[1.0625rem] leading-[1.7] sm:text-lg sm:leading-[1.7]",
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:scroll-mt-28",
  "prose-h1:mt-12 prose-h1:mb-4 prose-h1:text-3xl",
  "prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-2xl",
  "prose-h3:mt-8 prose-h3:mb-2 prose-h3:text-xl",
  "prose-h4:mt-6 prose-h4:mb-2 prose-h4:text-lg",
  "prose-p:my-5 prose-p:text-foreground/90",
  "prose-strong:text-foreground prose-strong:font-semibold",
  "prose-a:font-normal prose-a:text-primary prose-a:underline prose-a:decoration-primary/40 prose-a:underline-offset-4 hover:prose-a:decoration-primary",
  "prose-blockquote:border-l-2 prose-blockquote:border-foreground/20 prose-blockquote:pl-5 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-code:font-medium prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted prose-pre:text-sm prose-pre:leading-relaxed prose-pre:text-foreground",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-normal",
  "prose-ul:my-5 prose-ol:my-5 prose-li:my-1.5 prose-li:marker:text-muted-foreground",
  "prose-hr:my-10 prose-hr:border-border",
  "prose-img:my-0 prose-img:rounded-lg",
  "prose-figure:my-8 prose-figcaption:mt-2 prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-muted-foreground",
  "[&_.blog-figure-center]:mx-auto",
  "[&_.blog-figure-left]:float-left [&_.blog-figure-left]:mr-6 [&_.blog-figure-left]:mt-1 [&_.blog-figure-left]:w-1/2 [&_.blog-figure-left]:max-w-[420px]",
  "[&_.blog-figure-full]:clear-both [&_.blog-figure-full]:w-full",
].join(" ");

/** Estimated reading time at ~200 words per minute, never below one minute. */
export const readingMinutes = (text: string | null | undefined) => {
  const words = (text ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

/**
 * Covers are stored either as an uploaded image URL or, for older posts, a
 * `gradient:` preset. Gradient presets are no longer offered and are not
 * rendered as artwork, so callers treat them as "no cover image".
 */
export const coverImageOf = (url: string | null | undefined): string | null =>
  url && !url.startsWith("gradient:") ? url : null;
