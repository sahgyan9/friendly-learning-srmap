import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render, ROUTE_META, canonicalFor } = await import('./dist/server/entry-server.js')

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const DYNAMIC_META = {}

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
  const canonicalUrl = ROUTE_META[route] ? canonicalFor(route) : `https://friendlylearning.srmap.edu.in${route}`

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

  return out
}

const routesToPrerender = [
  '/',
  '/about',
  '/mentors',
  '/posts',
  '/signup',
  '/signin',
  '/contact',
  '/events',
  '/workspace-groups',
  '/how-it-works',
  '/find-study-partners',
  '/hackathon-partners',
  '/blog',
  '/how-verification-works',
  '/your-data',
]

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
    const { data: faculty } = await supabase
      .from('faculty')
      .select('slug, name, department, rating_count, bio')
      .eq('is_active', true)
      .not('slug', 'is', null)
      .order('rating_count', { ascending: false })
      .order('name', { ascending: true })
      .limit(100);
      
    if (faculty) {
      for (const f of faculty) {
        const route = `/faculty/${f.slug}`;
        routesToPrerender.push(route);
        DYNAMIC_META[route] = {
          title: `${f.name}${f.department ? ' — ' + f.department : ''} | Faculty at SRM AP`,
          description: f.bio ? f.bio.substring(0, 150) + '...' : `View ratings, courses, and reviews for ${f.name} at SRM University-AP.`
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
    
    // 3. Mentors (active, 50)
    const { data: mentors } = await supabase
      .from('mentors')
      .select('id, name, bio, department')
      .neq('department', 'General')
      .not('department', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (mentors) {
      for (const m of mentors) {
        const route = `/mentor/${m.id}`;
        routesToPrerender.push(route);
        DYNAMIC_META[route] = {
          title: `${m.name} | SRM AP Student Mentor`,
          description: m.bio ? m.bio.substring(0, 150) + '...' : `Connect with ${m.name}, a student mentor for ${m.department} at SRM AP.`
        };
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
    
    // 5. Blog posts
    const { data: blogs } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt')
      .limit(50);
      
    if (blogs) {
      for (const b of blogs) {
        const route = b.slug ? `/blog/${b.slug}` : `/blog`; // skipping if no slug
        if (b.slug) {
          routesToPrerender.push(route);
          DYNAMIC_META[route] = {
            title: `${b.title} | Friendly Learning Blog`,
            description: b.excerpt ? b.excerpt : `Read ${b.title} on the Friendly Learning SRMAP blog.`
          };
        }
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

  const staticFiles = ['robots.txt', 'sitemap.xml', '.htaccess']

  for (const file of staticFiles) {
    const sourcePath = toAbsolute(`public/${file}`)
    const destPath = toAbsolute(`dist/${file}`)

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath)
      console.log('copied static file:', destPath)
    }
  }
})()
