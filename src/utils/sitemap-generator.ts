
export const generateSitemap = () => {
  const baseUrl = 'https://friendly-learning.lovable.app';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const pages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/mentors', priority: '0.9', changefreq: 'daily' },
    { url: '/about', priority: '0.7', changefreq: 'monthly' },
    { url: '/contact', priority: '0.6', changefreq: 'monthly' },
    { url: '/become-mentor', priority: '0.8', changefreq: 'weekly' },
    { url: '/marketplace', priority: '0.7', changefreq: 'weekly' },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
  // In a real implementation, this would write to public/sitemap.xml
  console.log('Sitemap generated:', sitemap);
  return sitemap;
};
