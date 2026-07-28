/**
 * Dynamic Sitemap Generator for Friendly Learning SRMAP
 * 
 * This script generates sitemap.xml and sitemap-index.xml files 
 * based on the actual routes in the application.
 * 
 * Run this script as part of the build process to ensure
 * sitemaps always reflect the actual website content.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SITE_URL } from './site.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
    siteUrl: SITE_URL,
    publicDir: path.join(__dirname, 'public'),
    lastmod: new Date().toISOString().split('T')[0],
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.7,
    disallowedPaths: ['/unauthorized', '/admin', '/admin/*', '/profile'],
    routeConfig: {
        '/': { changefreq: 'daily', priority: 1.0, images: [{ loc: '/og-image.png', title: 'Friendly Learning SRMAP - University Student Collaboration Platform', caption: 'Connect with university students for mentoring, study partnerships, and project collaborations' }] },
        '/about': { changefreq: 'monthly', priority: 0.8, images: [{ loc: '/about-team.png', title: 'About Friendly Learning SRMAP Team' }] },
        '/mentors': { changefreq: 'daily', priority: 0.9 },
        '/community-posts': { changefreq: 'daily', priority: 0.9 },
        '/signup': { changefreq: 'monthly', priority: 0.7 },
        '/signin': { changefreq: 'monthly', priority: 0.6 },
        '/contact': { changefreq: 'monthly', priority: 0.5 },
        '/marketplace': { changefreq: 'weekly', priority: 0.7 },
        '/become-mentor': { changefreq: 'monthly', priority: 0.6 },
        '/how-it-works': { changefreq: 'monthly', priority: 0.8 },
        '/find-study-partners': { changefreq: 'weekly', priority: 0.9 },
        '/hackathon-partners': { changefreq: 'weekly', priority: 0.9 },
        '/blog': { changefreq: 'weekly', priority: 0.8 }
    }
};

/**
 * Generate and write the main sitemap.xml file
 */
function generateMainSitemap() {
    console.log('Generating main sitemap.xml...');

    const routes = Object.keys(config.routeConfig);
    const timestamp = new Date().toISOString();

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">`;

    // Add each route to the sitemap
    routes.forEach(route => {
        if (!config.disallowedPaths.some(p => {
            if (p.endsWith('*')) {
                return route.startsWith(p.replace('*', ''));
            }
            return p === route;
        })) {
            const { changefreq, priority, images } = config.routeConfig[route];

            sitemap += `
  <url>
    <loc>${config.siteUrl}${route}</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>${changefreq || config.defaultChangeFreq}</changefreq>
    <priority>${priority || config.defaultPriority}</priority>`;

            // Add hreflang for homepage
            if (route === '/') {
                sitemap += `
    <xhtml:link rel="alternate" hreflang="en" href="${config.siteUrl}/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${config.siteUrl}/"/>`;
            }

            // Add image tags if present
            if (images && images.length > 0) {
                images.forEach(img => {
                    sitemap += `
    <image:image>
      <image:loc>${config.siteUrl}${img.loc}</image:loc>
      <image:title>${img.title}</image:title>`;

                    if (img.caption) {
                        sitemap += `
      <image:caption>${img.caption}</image:caption>`;
                    }

                    sitemap += `
    </image:image>`;
                });
            }

            sitemap += `
  </url>`;
        }
    });

    sitemap += `
</urlset>`;

    fs.writeFileSync(path.join(config.publicDir, 'sitemap.xml'), sitemap);
    console.log('Main sitemap.xml generated successfully');
}

/**
 * Generate a specialized blog sitemap (can be expanded in the future)
 */
function generateBlogSitemap() {
    console.log('Generating blog sitemap...');

    const timestamp = new Date().toISOString();

    // In a production app, you would fetch actual blog posts from your database or CMS
    // For now, we'll just include the main blog page
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
  <url>
    <loc>${config.siteUrl}/blog</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    fs.writeFileSync(path.join(config.publicDir, 'sitemap-blog.xml'), sitemap);
    console.log('Blog sitemap generated successfully');
}

/**
 * Generate the sitemap index file
 */
function generateSitemapIndex() {
    console.log('Generating sitemap index...');

    const timestamp = new Date().toISOString();

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${config.siteUrl}/sitemap.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${config.siteUrl}/sitemap-blog.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>
</sitemapindex>`;

    fs.writeFileSync(path.join(config.publicDir, 'sitemap-index.xml'), sitemapIndex);
    console.log('Sitemap index generated successfully');
}

// Main execution
try {
    generateMainSitemap();
    generateBlogSitemap();
    generateSitemapIndex();
    console.log('All sitemaps generated successfully!');
} catch (error) {
    console.error('Error generating sitemaps:', error);
    process.exit(1);
}
