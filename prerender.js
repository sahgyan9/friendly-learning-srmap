
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render } = await import('./dist/server/entry-server.js')

// Explicit list of public, SEO-friendly routes
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
  '/blog'
]

  ; (async () => {
    for (const url of routesToPrerender) {
      const appHtml = render(url);
      const html = template.replace(`<!--app-html-->`, appHtml)

      const filePath = `dist${url === '/' ? '/index' : url}.html`
      fs.writeFileSync(toAbsolute(filePath), html)
      console.log('pre-rendered:', filePath)
    }

    // Ensure static files are accessible
    // Copy robots.txt, sitemap.xml, and .htaccess from public to dist root if they don't exist
    const staticFiles = ['robots.txt', 'sitemap.xml', '.htaccess']

    for (const file of staticFiles) {
      const sourcePath = toAbsolute(`public/${file}`)
      const destPath = toAbsolute(`dist/${file}`)

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath)
        console.log('copied static file:', destPath)
      }
    }

    // Generate sitemap.xml from an explicit list of public routes
    const primary = 'https://www.project-fl.me';
    const legacy = 'https://friendly-learning.lovable.app';
    const today = new Date().toISOString().split('T')[0];
    const publicRoutes = [
      '/',
      '/about',
      '/mentors',
      '/community',
      '/signup',
      '/signin',
      '/contact',
      '/marketplace',
      '/become-mentor',
      '/how-it-works',
      '/find-study-partners',
      '/hackathon-partners',
      '/blog'
    ];
    const urls = publicRoutes.map((r) => {
      const loc = r === '/' ? `${primary}/` : `${primary}${r}`;
      const isHome = r === '/';
      const priority = isHome ? '1.0' : '0.8';
      const changefreq = isHome ? 'weekly' : 'monthly';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    }).join('\n');

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n${urls}\n</urlset>`;

    fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemapContent);
    console.log('generated sitemap.xml from routes with primary domain');

    const legacySitemap = sitemapContent.replaceAll(primary, legacy);
    fs.writeFileSync(toAbsolute('dist/sitemap-legacy.xml'), legacySitemap);
    console.log('generated sitemap-legacy.xml for legacy domain');
  })()
