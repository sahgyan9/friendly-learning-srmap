
export const generateSitemap = () => {
  const baseUrl = 'https://www.project-fl.me';
  const currentDate = new Date().toISOString().split('T')[0];

  const pages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/mentors', priority: '0.9', changefreq: 'daily' },
    { url: '/community-posts', priority: '0.9', changefreq: 'daily' },
    { url: '/marketplace', priority: '0.7', changefreq: 'weekly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
    { url: '/signup', priority: '0.7', changefreq: 'monthly' },
    { url: '/signin', priority: '0.6', changefreq: 'monthly' },
    { url: '/become-mentor', priority: '0.6', changefreq: 'monthly' },
    { url: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
    { url: '/find-study-partners', priority: '0.9', changefreq: 'weekly' },
    { url: '/hackathon-partners', priority: '0.9', changefreq: 'weekly' },
    { url: '/blog', priority: '0.7', changefreq: 'weekly' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
};

// Generate sitemap for multiple domains
export const generateMultiDomainSitemap = (domain: string) => {
  const baseUrl = `https://${domain}`;
  const currentDate = new Date().toISOString().split('T')[0];

  const pages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/mentors', priority: '0.9', changefreq: 'daily' },
    { url: '/community-posts', priority: '0.9', changefreq: 'daily' },
    { url: '/marketplace', priority: '0.7', changefreq: 'weekly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
    { url: '/signup', priority: '0.7', changefreq: 'monthly' },
    { url: '/signin', priority: '0.6', changefreq: 'monthly' },
    { url: '/become-mentor', priority: '0.6', changefreq: 'monthly' },
    { url: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
    { url: '/find-study-partners', priority: '0.9', changefreq: 'weekly' },
    { url: '/hackathon-partners', priority: '0.9', changefreq: 'weekly' },
    { url: '/blog', priority: '0.7', changefreq: 'weekly' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
};

// Function to generate sitemap file (would be used in build process)
export const createSitemapFile = () => {
  if (typeof window !== 'undefined') return; // Only run in Node.js environment

  const sitemap = generateSitemap();
  console.log('Sitemap generated:', sitemap);
  return sitemap;
};

// Generate sitemap index for multiple sitemaps
export const generateSitemapIndex = (baseUrl: string = 'https://www.project-fl.me') => {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const sitemaps = [
    'sitemap.xml',
    'sitemap-mentors.xml',
    'sitemap-posts.xml'
  ];

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${baseUrl}/${sitemap}</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return sitemapIndex;
};
