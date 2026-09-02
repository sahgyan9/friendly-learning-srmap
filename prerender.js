import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { SITE_URL } from './site.config.js'

dotenv.config()

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render, ROUTE_META, canonicalFor } = await import('./dist/server/entry-server.js')

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const DYNAMIC_META = {}
const DYNAMIC_SCHEMAS = {}

const applyMeta = (html, route) => {
  const meta = ROUTE_META[route] || DYNAMIC_META[route]
  if (!meta) {
    throw new Error(
      `No entry in ROUTE_META or DYNAMIC_META for "${route}". Add one in src/lib/seo/route-meta.ts — ` +
        `without it this page would ship with the homepage's title and share card.`,
    )
  }

  const title = escapeAttr(meta.title)
  const description = escapeAttr(meta.description)
  // Fix for dynamic canonical URLs
  const canonicalUrl = ROUTE_META[route] ? canonicalFor(route) : `${SITE_URL}${route}`

  const substitutions = [
    [/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`],
    [/<meta name="description"\s+content="[\s\S]*?"\s*\/?>/, `<meta name="description" content="${description}" />`],
    [/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonicalUrl}" />`],
    [/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonicalUrl}" />`],
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

  if (DYNAMIC_SCHEMAS[route]) {
    const schemaTag = `<script type="application/ld+json">${JSON.stringify(DYNAMIC_SCHEMAS[route])}</script>\n`
    out = out.replace('</head>', `${schemaTag}</head>`)
  }

  return out
}

const routesToPrerender = [
  '/',
  '/about',
  '/mentors',
  '/posts',
  '/faculty',
  '/opportunities',
  '/signup',
  '/signin',
  '/contact',
  '/events',
  '/workspace-groups',
  '/how-it-works',
  '/find-study-partners',
  '/hackathon-partners',
  '/srm-ap-student-portal',
  '/blog',
  '/blogs',
  '/how-verification-works',
  '/your-data',
]

// 4 blog posts from src/data/blog-posts.ts
const STATIC_BLOG_POSTS = [
  {
    slug: 'everything-you-can-do-on-friendly-learning',
    title: "Everything You Can Do on Friendly Learning (It's More Than You Think)",
    excerpt: "Most students use one or two features. Here's the full picture — from CampusBrain search and community posts to groups, mentors, faculty, and opportunities.",
  },
  {
    slug: 'choosing-electives-srm-ap',
    title: 'How to Choose Your Electives at SRM AP Without Guessing',
    excerpt: 'Course codes and credit counts tell you nothing about what a semester will actually feel like. Here is how to find out before you register.',
  },
  {
    slug: 'finding-hackathon-teammates',
    title: 'Finding Hackathon Teammates Who Actually Show Up',
    excerpt: 'Most hackathon teams fall apart before the event starts. The fix is being specific about what you need, and asking early.',
  },
  {
    slug: 'asking-for-academic-help',
    title: 'Asking for Academic Help Without Feeling Awkward About It',
    excerpt: "The students who do best are not the ones who need the least help — they're the ones who ask earliest. A practical guide to asking well.",
  },
]

for (const post of STATIC_BLOG_POSTS) {
  const route = `/blog/${post.slug}`
  routesToPrerender.push(route)
  DYNAMIC_META[route] = {
    title: `${post.title} | Friendly Learning Blog`,
    description: post.excerpt,
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = (() => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[prerender] Supabase credentials not found. Skipping dynamic routes.');
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.warn(`[prerender] Could not create Supabase client: ${error.message}`);
    return null;
  }
})();

;(async () => {
  if (supabase) {
    console.log('[prerender] Fetching dynamic routes from Supabase...');
    
    // 1. Faculty (top 100 rated)
    const { data: faculty, error: facultyError } = await supabase
      .from('faculty')
      .select('slug, name, department, rating_count, designation, research_details')
      .eq('is_active', true)
      .not('slug', 'is', null)
      .order('rating_count', { ascending: false })
      .order('name', { ascending: true })
      .limit(100);
      
    if (facultyError) {
      console.warn('[prerender] Could not fetch faculty:', facultyError.message);
    } else if (faculty) {
      for (const f of faculty) {
        const route = `/faculty/${f.slug}`;
        routesToPrerender.push(route);
        let desc = `View ratings, courses, and reviews for ${f.name}${f.department ? ' in ' + f.department : ''} at SRM University-AP.`;
        if (Array.isArray(f.research_details) && f.research_details.length > 0 && typeof f.research_details[0] === 'string') {
          desc = f.research_details[0].slice(0, 155) + '...';
        } else if (Array.isArray(f.interests) && f.interests.length > 0) {
          desc = `Research areas include ${f.interests.slice(0, 3).join(', ')}. View ratings and reviews for ${f.name} at SRM University-AP.`;
        }
        DYNAMIC_META[route] = {
          title: `${f.name}${f.department ? ' — ' + f.department : ''} | Faculty at SRM AP`,
          description: desc
        };
      }
    }
    
    // 2. Opportunities (recent 50)
    const { data: opps } = await supabase
      .from('opportunities')
      .select('slug, title, description')
      .not('slug', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (opps) {
      for (const o of opps) {
        const route = `/opportunities/${o.slug}`;
        routesToPrerender.push(route);
        DYNAMIC_META[route] = {
          title: `${o.title} | SRM AP Opportunities`,
          description: o.description ? o.description.substring(0, 150) + '...' : `View details for ${o.title} on Friendly Learning SRMAP.`
        };
      }
    }
    
    // 3. Mentors
    const { data: mentors, error: mentorError } = await supabase
      .from('mentors')
      .select('id, slug, name, bio, department, profile_image, skills, linkedin_url, university, job_title, company')
      .order('created_at', { ascending: false });
      
    if (mentorError) {
      console.warn('[prerender] Could not fetch mentors:', mentorError.message);
    } else if (mentors) {
      for (const m of mentors) {
        const mentorSlug = m.slug || m.id;
        const route = `/mentor/${mentorSlug}`;
        routesToPrerender.push(route);
        const metaTitle = `${m.name} - Friendly Learning SRMAP Mentor | ${m.department || 'Student Mentor'}`;
        const metaDesc = m.bio
          ? m.bio.substring(0, 150) + '...'
          : `Connect with ${m.name}, a student mentor for ${m.department || 'academics'} at SRM University-AP.`;

        DYNAMIC_META[route] = {
          title: metaTitle,
          description: metaDesc
        };

        const personSchema = {
          "@context": "https://schema.org",
          "@type": "Person",
          "name": m.name,
          "description": m.bio || metaDesc,
          "image": m.profile_image || undefined,
          "url": `${SITE_URL}/mentor/${mentorSlug}`,
          "jobTitle": m.department ? `${m.department} Mentor` : "Mentor",
          "worksFor": {
            "@type": "Organization",
            "name": "Friendly Learning SRMAP"
          },
          "knowsAbout": m.skills || [],
          "alumniOf": m.university || "SRM University-AP"
        };
        if (m.linkedin_url) {
          personSchema.sameAs = [m.linkedin_url];
        }
        DYNAMIC_SCHEMAS[route] = personSchema;
      }
    }

    // 4. Communities (all active)
    const { data: communities } = await supabase
      .from('communities')
      .select('slug, name, description')
      .eq('is_archived', false)
      .not('slug', 'is', null)
      .limit(100);
      
    if (communities) {
      for (const c of communities) {
        const route = `/workspace-groups/${c.slug}`;
        routesToPrerender.push(route);
        DYNAMIC_META[route] = {
          title: `${c.name} | SRM AP Workspace Group`,
          description: c.description ? c.description.substring(0, 150) + '...' : `Join ${c.name}, a workspace group at SRM University-AP.`
        };
      }
    }

    // 5. Community Blog posts (published, most recent 100) — distinct from the
    // 4 hardcoded /blog posts above; error-checked like faculty/mentors since
    // this table is new and a build against an unmigrated database should
    // degrade to skipping these routes, not fail the whole prerender.
    const { data: blogPosts, error: blogPostsError } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, cover_image_url')
      .eq('is_published', true)
      .not('slug', 'is', null)
      .order('published_at', { ascending: false })
      .limit(100);

    if (blogPostsError) {
      console.warn('[prerender] Could not fetch blog_posts:', blogPostsError.message);
    } else if (blogPosts) {
      for (const p of blogPosts) {
        const route = `/blogs/${p.slug}`;
        routesToPrerender.push(route);
        DYNAMIC_META[route] = {
          title: `${p.title} | Community Blog`,
          description: p.excerpt
            ? p.excerpt.slice(0, 155)
            : `Read "${p.title}" on Friendly Learning SRMAP's Community Blog.`,
        };
      }
    }
  }

  for (const url of routesToPrerender) {
    const isDynamic = !!DYNAMIC_META[url];
    const { html: appHtml, statusCode } = await render(url)

    const main = appHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? ''
    const mainText = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    if (!isDynamic) {
      if (/animate-spin/.test(main) && mainText.length < 60) {
        throw new Error(
          `${url} pre-rendered to a loading spinner, not the page. Either it is behind ` +
            `ProtectedRoute — auth never resolves during a build, so it can only ever ` +
            `render the guard — or a lazy import failed. Remove it from ` +
            `routesToPrerender along with its rewrite in vercel.json, or make it public.`,
        )
      }

      if (mainText.length < 50) {
        throw new Error(
          `${url} pre-rendered with only ${mainText.length} characters inside <main> ` +
            `("${mainText.slice(0, 60)}"). Serving that would give crawlers an empty document.`,
        )
      }
    }

    const html = applyMeta(
      template
        .replace(`<!--app-html-->`, appHtml)
        .replace(
          '</head>',
          `<meta name="http-status" content="${statusCode}">\n` +
            `<meta name="prerendered-path" content="${escapeAttr(url)}">\n</head>`,
        ),
      url,
    )

    let filePath;
    if (url === '/') {
      filePath = 'dist/index.html';
    } else {
      filePath = `dist${url}.html`;
      // Ensure the directory exists (e.g. dist/faculty/some-slug.html)
      const dir = path.dirname(toAbsolute(filePath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    fs.writeFileSync(toAbsolute(filePath), html)
    console.log(`pre-rendered: ${filePath} (status: ${statusCode})`)

    if (statusCode === 404 && url === '*') {
      fs.writeFileSync(toAbsolute('dist/404.html'), html)
      console.log('created 404.html file for server configuration')
    }
  }

  const staticFiles = [
    'robots.txt',
    'sitemap.xml',
    'sitemap-index.xml',
    'sitemap-blog.xml',
    'sitemap-mentors.xml',
    'sitemap-community.xml',
    'sitemap-groups.xml',
    'sitemap-faculty.xml',
    '.htaccess'
  ]

  for (const file of staticFiles) {
    const sourcePath = toAbsolute(`public/${file}`)
    const destPath = toAbsolute(`dist/${file}`)

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath)
      console.log('copied static file:', destPath)
    }
  }
})()
