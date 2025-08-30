/**
 * Advanced Dynamic Sitemap Generator for Project FL
 * 
 * This script generates sitemap.xml files that include:
 * 1. Static routes from the application
 * 2. Dynamic content from Supabase database (blog posts, mentor profiles, community posts)
 * 
 * To use:
 * 1. Make sure environment variables for Supabase are set
 * 2. Run: node generate-dynamic-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Import environment variables
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Site configuration
const config = {
    siteUrl: 'https://www.project-fl.me',
    publicDir: path.join(__dirname, 'public'),
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.7,
    disallowedPaths: ['/unauthorized', '/admin', '/admin/*', '/profile', '/messages'],
    routeConfig: {
        '/': { changefreq: 'daily', priority: 1.0, images: [{ loc: '/og-image.png', title: 'Project FL - University Student Collaboration Platform', caption: 'Connect with university students for mentoring, study partnerships, and project collaborations' }] },
        '/about': { changefreq: 'monthly', priority: 0.8, images: [{ loc: '/about-team.png', title: 'About Project FL Team' }] },
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
 * Generate and write the main sitemap.xml file with static routes
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
 * Fetch mentor profiles from Supabase and generate a sitemap
 */
async function generateMentorsSitemap() {
    console.log('Fetching mentor data from Supabase...');

    try {
        // Fetch active mentors from the database
        const { data: mentors, error } = await supabase
            .from('mentors')
            .select('id, name, profile_image, department')
            .neq('department', 'General')
            .not('department', 'is', null);

        const timestamp = new Date().toISOString();

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">`;

        // Add main mentors page
        sitemap += `
  <url>
    <loc>${config.siteUrl}/mentors</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        // Add each mentor profile page
        mentors.forEach(mentor => {
            sitemap += `
  <url>
    <loc>${config.siteUrl}/mentor/${mentor.id}</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

            if (mentor.profile_image) {
                sitemap += `
    <image:image>
      <image:loc>${mentor.profile_image}</image:loc>
      <image:title>${mentor.name || 'Mentor'} - Project FL Mentor</image:title>
    </image:image>`;
            }

            sitemap += `
  </url>`;
        });

        sitemap += `
</urlset>`;

        fs.writeFileSync(path.join(config.publicDir, 'sitemap-mentors.xml'), sitemap);
        console.log(`Mentors sitemap generated successfully with ${mentors.length} mentor profiles`);
        return true;
    } catch (error) {
        console.error('Error generating mentors sitemap:', error);
        return false;
    }
}

/**
 * Fetch community posts from Supabase and generate a sitemap
 */
async function generateCommunityPostsSitemap() {
    console.log('Fetching community posts data from Supabase...');

    try {
        // Fetch active community posts
        const { data: posts, error } = await supabase
            .from('community_posts')
            .select('id, created_at, title, image_url')
            .eq('status', 'open');

        const timestamp = new Date().toISOString();

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">`;

        // Add main community posts page
        sitemap += `
  <url>
    <loc>${config.siteUrl}/community-posts</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        // Add each community post page
        posts.forEach(post => {
            sitemap += `
  <url>
    <loc>${config.siteUrl}/community-posts/${post.id}</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

            if (post.image_url) {
                sitemap += `
    <image:image>
      <image:loc>${post.image_url}</image:loc>
      <image:title>${post.title}</image:title>
    </image:image>`;
            }

            sitemap += `
  </url>`;
        });

        sitemap += `
</urlset>`;

        fs.writeFileSync(path.join(config.publicDir, 'sitemap-community.xml'), sitemap);
        console.log(`Community posts sitemap generated successfully with ${posts.length} posts`);
        return true;
    } catch (error) {
        console.error('Error generating community posts sitemap:', error);
        return false;
    }
}

/**
 * Fetch blog posts from Supabase and generate a sitemap
 */
async function generateBlogSitemap() {
    console.log('Checking if blog_posts table exists...');

    try {
        // First check if we can access the pg_tables system table
        try {
            // First check if the blog_posts table exists
            const { data: tableExists, error: checkError } = await supabase
                .from('pg_tables')
                .select('tablename')
                .eq('schemaname', 'public')
                .eq('tablename', 'blog_posts')
                .maybeSingle();

            if (checkError || !tableExists) {
                console.log('Blog posts table does not exist yet. Using static blog sitemap.');
                generateStaticBlogSitemap();
                return true;
            }
        } catch (e) {
            console.log('Could not check pg_tables. Using static blog sitemap.');
            generateStaticBlogSitemap();
            return true;
        }



        // Fetch published blog posts if table exists
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select('id, created_at, title, image_url, slug');

        if (error) {
            throw error;
        }

        const timestamp = new Date().toISOString();

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">`;

        // Add main blog page
        sitemap += `
  <url>
    <loc>${config.siteUrl}/blog</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

        // Check if we have posts
        if (posts && posts.length > 0) {
            // Add each blog post page
            posts.forEach(post => {
                const postUrl = post.slug ?
                    `${config.siteUrl}/blog/${post.slug}` :
                    `${config.siteUrl}/blog/${post.id}`;

                sitemap += `
  <url>
    <loc>${postUrl}</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

                if (post.image_url) {
                    sitemap += `
    <image:image>
      <image:loc>${post.image_url}</image:loc>
      <image:title>${post.title}</image:title>
    </image:image>`;
                }

                sitemap += `
  </url>`;
            });
        } else {
            console.log('No blog posts found in database. Only including main blog page in sitemap.');
        }

        sitemap += `
</urlset>`;

        fs.writeFileSync(path.join(config.publicDir, 'sitemap-blog.xml'), sitemap);
        console.log(`Blog sitemap generated successfully${posts ? ' with ' + posts.length + ' posts' : ''}`);
        return true;
    } catch (error) {
        console.error('Error generating blog sitemap:', error);
        // Fallback to static blog sitemap if there's an error
        generateStaticBlogSitemap();
        return false;
    }
}

/**
 * Generate a static blog sitemap as fallback
 */
function generateStaticBlogSitemap() {
    console.log('Generating static blog sitemap as fallback...');

    const timestamp = new Date().toISOString();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
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
    console.log('Static blog sitemap generated successfully');
}

/**
 * Generate the sitemap index file
 */
async function generateSitemapIndex(availableSitemaps) {
    console.log('Generating sitemap index...');

    const timestamp = new Date().toISOString();

    let sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${config.siteUrl}/sitemap.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>`;

    // Add available dynamic sitemaps
    if (availableSitemaps.blog) {
        sitemapIndex += `
  <sitemap>
    <loc>${config.siteUrl}/sitemap-blog.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>`;
    }

    if (availableSitemaps.mentors) {
        sitemapIndex += `
  <sitemap>
    <loc>${config.siteUrl}/sitemap-mentors.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>`;
    }

    if (availableSitemaps.community) {
        sitemapIndex += `
  <sitemap>
    <loc>${config.siteUrl}/sitemap-community.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>`;
    }

    sitemapIndex += `
</sitemapindex>`;

    fs.writeFileSync(path.join(config.publicDir, 'sitemap-index.xml'), sitemapIndex);
    console.log('Sitemap index generated successfully');
}

/**
 * Main execution function
 */
async function generateSitemaps() {
    try {
        console.log('Starting dynamic sitemap generation...');

        // Generate the main sitemap with static routes
        generateMainSitemap();

        // Generate dynamic content sitemaps and track which ones were successfully created
        const availableSitemaps = {
            blog: false,
            mentors: false,
            community: false
        };

        // Generate blog sitemap
        availableSitemaps.blog = await generateBlogSitemap();

        // Generate mentors sitemap
        availableSitemaps.mentors = await generateMentorsSitemap();

        // Generate community posts sitemap
        availableSitemaps.community = await generateCommunityPostsSitemap();

        // Generate the sitemap index based on available sitemaps
        await generateSitemapIndex(availableSitemaps);

        console.log('All sitemaps generated successfully!');
    } catch (error) {
        console.error('Error in sitemap generation:', error);
        process.exit(1);
    }
}

// Execute the main function
generateSitemaps();
