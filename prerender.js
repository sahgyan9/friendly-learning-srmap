
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

;(async () => {
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

  // Generate comprehensive sitemap.xml with proper SEO structure
  const primaryDomain = 'https://www.project-fl.me';
  const legacyDomain = 'https://friendly-learning.lovable.app';
  const today = new Date().toISOString().split('T')[0];
  
  const publicRoutes = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/about', priority: '0.8', changefreq: 'monthly' },
    { path: '/mentors', priority: '0.9', changefreq: 'daily' },
    { path: '/community-posts', priority: '0.9', changefreq: 'daily' },
    { path: '/marketplace', priority: '0.7', changefreq: 'weekly' },
    { path: '/contact', priority: '0.5', changefreq: 'monthly' },
    { path: '/signup', priority: '0.7', changefreq: 'monthly' },
    { path: '/signin', priority: '0.6', changefreq: 'monthly' },
    { path: '/become-mentor', priority: '0.6', changefreq: 'monthly' },
    { path: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
    { path: '/find-study-partners', priority: '0.9', changefreq: 'weekly' },
    { path: '/hackathon-partners', priority: '0.9', changefreq: 'weekly' },
    { path: '/blog', priority: '0.7', changefreq: 'weekly' }
  ];

  // Generate primary domain sitemap
  const urls = publicRoutes.map((route) => {
    const loc = route.path === '/' ? `${primaryDomain}/` : `${primaryDomain}${route.path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
  }).join('\n');

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n${urls}\n</urlset>`;

  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemapContent);
  console.log('generated primary sitemap.xml with comprehensive SEO structure');

  // Generate legacy domain sitemap
  const legacyUrls = publicRoutes.map((route) => {
    const loc = route.path === '/' ? `${legacyDomain}/` : `${legacyDomain}${route.path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`;
  }).join('\n');

  const legacySitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n${legacyUrls}\n</urlset>`;

  fs.writeFileSync(toAbsolute('dist/sitemap-legacy.xml'), legacySitemapContent);
  console.log('generated legacy domain sitemap for transition period');

  // Generate sitemap index
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${primaryDomain}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${primaryDomain}/sitemap-legacy.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  fs.writeFileSync(toAbsolute('dist/sitemapindex.xml'), sitemapIndex);
  console.log('generated sitemap index for better SEO organization');
})()
