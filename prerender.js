
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render, ROUTE_META, canonicalFor } = await import('./dist/server/entry-server.js')

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Rewrites the head tags that describe the page.
 *
 * Every pre-rendered file is stamped out of dist/index.html, so without this
 * they all carry the homepage's title, description and share card. That is
 * invisible in a browser — SEOHead corrects it on mount — but WhatsApp,
 * LinkedIn, Slack and X never run that code. They read the HTML as delivered,
 * which is why a shared /blog link previewed as the homepage.
 *
 * Replacements are anchored on the exact tags in index.html. If one stops
 * matching, the count check below fails the build rather than letting the page
 * ship with the wrong description.
 */
const applyMeta = (html, route) => {
  const meta = ROUTE_META[route]
  if (!meta) {
    throw new Error(
      `No entry in ROUTE_META for "${route}". Add one in src/lib/seo/route-meta.ts — ` +
        `without it this page would ship with the homepage's title and share card.`,
    )
  }

  const title = escapeAttr(meta.title)
  const description = escapeAttr(meta.description)
  const url = canonicalFor(route)

  const substitutions = [
    [/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`],
    [/<meta name="description"\s+content="[\s\S]*?"\s*\/?>/, `<meta name="description" content="${description}" />`],
    [/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`],
    [/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`],
    [/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`],
    [/<meta property="og:description"\s+content="[\s\S]*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`],
    [/<meta property="twitter:title" content="[^"]*"\s*\/?>/, `<meta property="twitter:title" content="${title}" />`],
    [/<meta property="twitter:description"\s+content="[\s\S]*?"\s*\/?>/, `<meta property="twitter:description" content="${description}" />`],
  ]

  let out = html
  const unmatched = []
  for (const [pattern, replacement] of substitutions) {
    if (!pattern.test(out)) {
      unmatched.push(pattern.source.slice(0, 48))
      continue
    }
    out = out.replace(pattern, replacement)
  }

  if (unmatched.length) {
    throw new Error(
      `These head tags no longer match index.html, so ${route} would keep the ` +
        `homepage values:\n  ${unmatched.join('\n  ')}`,
    )
  }

  return out
}

// Comprehensive list of public, SEO-friendly routes
const routesToPrerender = [
  '/',
  '/about',
  '/mentors',
  '/community-posts',
  '/signup',
  '/signin',
  '/contact',
  '/marketplace',
  '/how-it-works',
  '/find-study-partners',
  '/hackathon-partners',
  '/blog',
  '/become-mentor'
]

  ; (async () => {
    for (const url of routesToPrerender) {
      const { html: appHtml, statusCode } = render(url);
      const html = applyMeta(
        template
          .replace(`<!--app-html-->`, appHtml)
          // Add status code meta tag for search engines
          .replace('</head>', `<meta name="http-status" content="${statusCode}">\n</head>`),
        url,
      )

      const filePath = `dist${url === '/' ? '/index' : url}.html`
      fs.writeFileSync(toAbsolute(filePath), html)
      console.log(`pre-rendered: ${filePath} (status: ${statusCode})`)

      // If this is a 404 route, also create a 404.html file at the root
      if (statusCode === 404 && url === '*') {
        fs.writeFileSync(toAbsolute('dist/404.html'), html)
        console.log('created 404.html file for server configuration')
      }
    }

    // Ensure static files are accessible
    const staticFiles = ['robots.txt', 'sitemap.xml', '.htaccess']

    for (const file of staticFiles) {
      const sourcePath = toAbsolute(`public/${file}`)
      const destPath = toAbsolute(`dist/${file}`)

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath)
        console.log('copied static file:', destPath)
      }
    }

    // Sitemaps are not generated here. generate-dynamic-sitemap.js owns them,
    // and it now runs first in `npm run build` so its output is in public/
    // before Vite copies that directory into dist/.
    //
    // This file used to write its own dist/sitemap.xml from a hardcoded route
    // list, which overwrote the richer generated one — production served 13
    // bare URLs instead of the 14 with image and hreflang annotations. It also
    // wrote dist/sitemapindex.xml, which nothing referenced: robots.txt points
    // at sitemap-index.xml, so that file was an orphan Google could still find
    // and crawl as a second, conflicting index.
  })()
