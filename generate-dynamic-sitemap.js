/**
 * Advanced Dynamic Sitemap Generator for Friendly Learning SRMAP
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
import { SITE_URL } from './site.config.js';
import { createClient } from '@supabase/supabase-js';

// Import environment variables
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration.
//
// Guarded, because this runs first in `npm run build` and used to take the
// whole deploy down with it. The credentials arrived via a committed .env;
// once that was removed from the repo (correctly — it should never have been
// tracked) dotenv loaded nothing, `createClient` was handed the literal string
// 'your-supabase-url', and it threw at module load, before the try/catch at the
// bottom of this file could ever run. Every deploy failed from that point on.
//
// A sitemap missing its dynamic entries is a bad day. A site that cannot ship
// at all is a worse one, so this degrades instead: the static sitemap is still
// written, and the per-table sections are skipped with a warning.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = (() => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '[sitemap] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
        'Writing the static sitemap only — mentors, posts, blog and faculty ' +
        'URLs will be missing. Set them in the Vercel project environment ' +
        'variables to restore the full sitemap.',
    );
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.warn(`[sitemap] Could not create the Supabase client: ${error.message}`);
    return null;
  }
})();

// Site configuration
const config = {
    siteUrl: SITE_URL,
    publicDir: path.join(__dirname, 'public'),
    defaultChangeFreq: 'weekly',
    defaultPriority: 0.7,
    disallowedPaths: ['/unauthorized', '/admin', '/admin/*', '/profile', '/messages'],
    routeConfig: {
        '/': { changefreq: 'daily', priority: 1.0, images: [{ loc: '/og-image.png', title: 'Friendly Learning SRMAP - University Student Collaboration Platform', caption: 'Connect with university students for mentoring, study partnerships, and project collaborations' }] },
        '/about': { changefreq: 'monthly', priority: 0.8, images: [{ loc: '/about-team.png', title: 'About Friendly Learning SRMAP Team' }] },
        '/mentors': { changefreq: 'daily', priority: 0.9 },
        '/posts': { changefreq: 'daily', priority: 0.9 },
        '/faculty': { changefreq: 'daily', priority: 0.9 },
        '/signup': { changefreq: 'monthly', priority: 0.7 },
        '/signin': { changefreq: 'monthly', priority: 0.6 },
        '/contact': { changefreq: 'monthly', priority: 0.5 },
        '/events': { changefreq: 'weekly', priority: 0.9 },
        '/workspace-groups': { changefreq: 'weekly', priority: 0.8 },
        '/become-mentor': { changefreq: 'monthly', priority: 0.6 },
        '/how-it-works': { changefreq: 'monthly', priority: 0.8 },
        '/find-study-partners': { changefreq: 'weekly', priority: 0.9 },
        '/hackathon-partners': { changefreq: 'weekly', priority: 0.9 },
        '/blog': { changefreq: 'weekly', priority: 0.8 },
        '/how-verification-works': { changefreq: 'monthly', priority: 0.5 },
        '/your-data': { changefreq: 'monthly', priority: 0.5 }
    }
};

/**
 * Sitemaps interpolate user-supplied text — post titles, mentor names — and
 * image URLs that can carry query strings. A single unescaped & or < makes the
 * whole file invalid XML, and Search Console rejects a sitemap it cannot parse,
 * so one awkward title silently takes out every URL in the file rather than
 * just its own.
 */
function xmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')   // must run first, or it double-escapes the rest
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

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
      <image:title>${xmlEscape(img.title)}</image:title>`;

                    if (img.caption) {
                        sitemap += `
      <image:caption>${xmlEscape(img.caption)}</image:caption>`;
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
    // No client, no dynamic entries — the caller treats false as
    // "this sitemap was not produced" and leaves it out of the index.
    if (!supabase) return false;

    console.log('Fetching mentor data from Supabase...');

    try {
        // Fetch active mentors from the database
        const { data: mentors, error } = await supabase
            .from('mentors')
            .select('id, name, profile_image, department, created_at')
            .neq('department', 'General')
            .not('department', 'is', null);

        // `error` was destructured but never checked, so a failed query left
        // `mentors` null and the forEach below threw during every build.
        if (error || !mentors) {
            console.warn('Skipping mentors sitemap:', error?.message ?? 'no rows returned');
            return;
        }

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
            // mentors has no updated_at column, so created_at is the best signal
            // available — still better than restamping every URL each build.
            const lastmod = mentor.created_at || timestamp;

            sitemap += `
  <url>
    <loc>${config.siteUrl}/mentor/${mentor.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

            if (mentor.profile_image) {
                sitemap += `
    <image:image>
      <image:loc>${xmlEscape(mentor.profile_image)}</image:loc>
      <image:title>${xmlEscape(mentor.name || 'Mentor')} - Friendly Learning SRMAP Mentor</image:title>
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
    // No client, no dynamic entries — the caller treats false as
    // "this sitemap was not produced" and leaves it out of the index.
    if (!supabase) return false;

    console.log('Fetching community posts data from Supabase...');

    try {
        // No status filter. The board and /community-posts/:id both serve every
        // post regardless of status — get_community_feed does not filter on it
        // either — so restricting the sitemap to status = 'open' dropped pages
        // that are live and indexable. It also failed silently: the single post
        // on the site is 'fulfilled', so the sitemap was being regenerated with
        // zero post URLs while the board displayed it.
        const { data: posts, error } = await supabase
            .from('community_posts')
            .select('id, created_at, updated_at, title, image_url')
            .order('created_at', { ascending: false });

        if (error || !posts) {
            console.warn('Skipping community posts sitemap:', error?.message ?? 'no rows returned');
            return;
        }

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
    <loc>${config.siteUrl}/posts</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        // Add each community post page
        posts.forEach(post => {
            // The post's own timestamp, not the build time. Stamping every URL
            // with "now" on each deploy tells crawlers everything changed when
            // nothing did, and they learn to discount the field.
            const lastmod = post.updated_at || post.created_at || timestamp;

            sitemap += `
  <url>
    <loc>${config.siteUrl}/posts/${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

            if (post.image_url) {
                sitemap += `
    <image:image>
      <image:loc>${xmlEscape(post.image_url)}</image:loc>
      <image:title>${xmlEscape(post.title)}</image:title>
    </image:image>`;
            }

            sitemap += `
  </url>`;
        });

        sitemap += `
</urlset>`;

        fs.writeFileSync(path.join(config.publicDir, 'sitemap-community.xml'), sitemap);
        console.log(`Posts sitemap generated successfully with ${posts.length} posts`);
        return true;
    } catch (error) {
        console.error('Error generating posts sitemap:', error);
        return false;
    }
}

/**
 * Fetch workspace groups (communities) from Supabase and generate a sitemap
 */
async function generateWorkspaceGroupsSitemap() {
    if (!supabase) return false;

    console.log('Fetching workspace groups data from Supabase...');

    try {
        const { data: groups, error } = await supabase
            .from('communities')
            .select('slug, name, updated_at, created_at, cover_image')
            .eq('is_archived', false)
            .not('slug', 'is', null);

        if (error || !groups) {
            console.warn('Skipping workspace groups sitemap:', error?.message ?? 'no rows returned');
            return false;
        }

        const timestamp = new Date().toISOString();

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">`;

        // Add main workspace groups page
        sitemap += `
  <url>
    <loc>${config.siteUrl}/workspace-groups</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        groups.forEach(group => {
            const lastmod = group.updated_at || group.created_at || timestamp;

            sitemap += `
  <url>
    <loc>${config.siteUrl}/workspace-groups/${encodeURIComponent(group.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

            if (group.cover_image) {
                sitemap += `
    <image:image>
      <image:loc>${xmlEscape(group.cover_image)}</image:loc>
      <image:title>${xmlEscape(group.name)} - SRM AP Workspace Group</image:title>
    </image:image>`;
            }

            sitemap += `
  </url>`;
        });

        sitemap += `
</urlset>`;

        fs.writeFileSync(path.join(config.publicDir, 'sitemap-groups.xml'), sitemap);
        console.log(`Workspace groups sitemap generated successfully with ${groups.length} groups`);
        return true;
    } catch (error) {
        console.error('Error generating workspace groups sitemap:', error);
        return false;
    }
}

/**
 * Fetch blog posts from Supabase and generate a sitemap
 */
async function generateBlogSitemap() {
    // No client, no dynamic entries — the caller treats false as
    // "this sitemap was not produced" and leaves it out of the index.
    if (!supabase) return false;

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
    <loc>${xmlEscape(postUrl)}</loc>
    <lastmod>${post.updated_at || post.published_at || timestamp}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>`;

                if (post.image_url) {
                    sitemap += `
    <image:image>
      <image:loc>${xmlEscape(post.image_url)}</image:loc>
      <image:title>${xmlEscape(post.title)}</image:title>
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
/**
 * Slugs and publication dates of the posts in `src/data/blog-posts.ts`, which
 * is the source of truth for blog content. They are repeated here because this
 * script runs under plain Node during the build and cannot import a TypeScript
 * module — add a post there, add its slug here.
 */
const STATIC_BLOG_POSTS = [
    { slug: 'choosing-electives-srm-ap', date: '2026-07-20' },
    { slug: 'finding-hackathon-teammates', date: '2026-07-12' },
    { slug: 'asking-for-academic-help', date: '2026-07-04' }
];

function generateStaticBlogSitemap() {
    console.log('Generating static blog sitemap as fallback...');

    const timestamp = new Date().toISOString();

    const postUrls = STATIC_BLOG_POSTS.map((post) => `
  <url>
    <loc>${config.siteUrl}/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

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
  </url>${postUrls}
</urlset>`;

    fs.writeFileSync(path.join(config.publicDir, 'sitemap-blog.xml'), sitemap);
    console.log('Static blog sitemap generated successfully');
}

/**
 * Faculty profile pages — the largest body of indexable content on the site,
 * and the one people actually search for by name ("Dr X SRM AP rating").
 * Without these URLs in a sitemap the only way in is the /faculty list, which
 * paginates 24 at a time behind JavaScript, so most of the directory was
 * effectively unreachable by crawlers.
 */
async function generateFacultySitemap() {
    // No client, no dynamic entries — the caller treats false as
    // "this sitemap was not produced" and leaves it out of the index.
    if (!supabase) return false;

    console.log('Fetching faculty data from Supabase...');

    try {
        // Paged rather than a single .limit(). PostgREST caps a response at the
        // server's max-rows regardless of what the client asks for, so a plain
        // limit would quietly stop returning everyone once the directory grew
        // past that cap — the same silent truncation this file already had.
        //
        // is_active mirrors getFacultyBySlug. That filter is not cosmetic: the
        // detail page returns "not found" for an inactive record, so listing
        // one here would advertise a soft 404.
        const PAGE = 500;
        const faculty = [];

        for (let from = 0; ; from += PAGE) {
            const { data, error } = await supabase
                .from('faculty')
                .select('slug, name, image_url, department, rating_count, updated_at')
                .eq('is_active', true)
                .not('slug', 'is', null)
                .order('rating_count', { ascending: false })
                .order('name', { ascending: true })
                .range(from, from + PAGE - 1);

            if (error) {
                console.warn('Skipping faculty sitemap:', error.message);
                return false;
            }
            if (!data || data.length === 0) break;

            faculty.push(...data);
            if (data.length < PAGE) break;
        }

        if (faculty.length === 0) {
            console.warn('Skipping faculty sitemap: no rows returned');
            return false;
        }

        const timestamp = new Date().toISOString();

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                            http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
  <url>
    <loc>${config.siteUrl}/faculty</loc>
    <lastmod>${timestamp}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

        faculty.forEach(member => {
            // A profile carrying reviews is the page worth ranking; the rest are
            // stubs inviting the first rating, so they sit a rung lower.
            const rated = Number(member.rating_count) > 0;

            sitemap += `
  <url>
    <loc>${config.siteUrl}/faculty/${encodeURIComponent(member.slug)}</loc>
    <lastmod>${member.updated_at || timestamp}</lastmod>
    <changefreq>${rated ? 'weekly' : 'monthly'}</changefreq>
    <priority>${rated ? '0.8' : '0.5'}</priority>`;

            if (member.image_url) {
                sitemap += `
    <image:image>
      <image:loc>${xmlEscape(member.image_url)}</image:loc>
      <image:title>${xmlEscape(member.name)}${member.department ? ' — ' + xmlEscape(member.department) : ''}, SRM University-AP</image:title>
    </image:image>`;
            }

            sitemap += `
  </url>`;
        });

        sitemap += `
</urlset>`;

        fs.writeFileSync(path.join(config.publicDir, 'sitemap-faculty.xml'), sitemap);
        const ratedCount = faculty.filter(m => Number(m.rating_count) > 0).length;
        console.log(`Faculty sitemap generated successfully with ${faculty.length} profiles (${ratedCount} rated)`);
        return true;
    } catch (error) {
        console.error('Error generating faculty sitemap:', error);
        return false;
    }
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

    if (availableSitemaps.groups) {
        sitemapIndex += `
  <sitemap>
    <loc>${config.siteUrl}/sitemap-groups.xml</loc>
    <lastmod>${timestamp}</lastmod>
  </sitemap>`;
    }

    if (availableSitemaps.faculty) {
        sitemapIndex += `
  <sitemap>
    <loc>${config.siteUrl}/sitemap-faculty.xml</loc>
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
            community: false,
            groups: false,
            faculty: false
        };

        // Generate blog sitemap
        availableSitemaps.blog = await generateBlogSitemap();

        // Generate mentors sitemap
        availableSitemaps.mentors = await generateMentorsSitemap();

        // Generate community posts sitemap
        availableSitemaps.community = await generateCommunityPostsSitemap();

        // Generate workspace groups sitemap
        availableSitemaps.groups = await generateWorkspaceGroupsSitemap();

        // Generate faculty profiles sitemap
        availableSitemaps.faculty = await generateFacultySitemap();

        // A section that could not be regenerated but whose file is still in
        // public/ stays in the index, because that file still gets served.
        // Dropping it would hide pages that are live and reachable — the
        // faculty sitemap alone carries ~620 URLs — and a sitemap listing
        // slightly stale lastmod dates is far better for discovery than one
        // that omits the pages entirely.
        const fileNames = {
            blog: 'sitemap-blog.xml',
            mentors: 'sitemap-mentors.xml',
            community: 'sitemap-community.xml',
            groups: 'sitemap-groups.xml',
            faculty: 'sitemap-faculty.xml',
        };

        for (const [key, fileName] of Object.entries(fileNames)) {
            if (availableSitemaps[key]) continue;
            if (fs.existsSync(path.join(config.publicDir, fileName))) {
                console.warn(`[sitemap] Keeping the existing ${fileName} in the index; it was not regenerated this build.`);
                availableSitemaps[key] = true;
            }
        }

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
