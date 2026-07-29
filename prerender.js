
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render } = await import('./dist/server/entry-server.js')

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
      const html = template
        .replace(`<!--app-html-->`, appHtml)
        // Add status code meta tag for search engines
        .replace('</head>', `<meta name="http-status" content="${statusCode}">\n</head>`)

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
