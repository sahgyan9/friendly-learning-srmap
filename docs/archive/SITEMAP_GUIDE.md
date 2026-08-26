# Sitemap Generation for Friendly Learning SRMAP

This document outlines how the sitemap generation works for Friendly Learning SRMAP.

## Available Scripts

### Basic Sitemap Generation

```bash
npm run generate:sitemap
```

This script generates basic sitemaps based on the static routes defined in the application. It creates:
- `sitemap.xml` - Contains all public-facing routes
- `sitemap-blog.xml` - Contains just the main blog page
- `sitemap-index.xml` - Index file pointing to all sitemaps

### Dynamic Sitemap Generation

```bash
npm run generate:dynamic-sitemap
```

This script connects to your Supabase database and generates comprehensive sitemaps including:
- Static routes (like homepage, about, etc.)
- Dynamic mentor profile pages
- Dynamic community posts
- Dynamic blog posts

**Requirements:**
- Supabase environment variables must be set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Integration with Build Process

The sitemap generation is automatically integrated into the build process:

```bash
npm run build
```

This runs the static sitemap generator after building the application.

## Manual Updates

For more control, you can run the dynamic sitemap generator separately:

```bash
npm run generate:dynamic-sitemap
```

## Configuration

The sitemap configuration is defined in each generator script:
- `generate-sitemap.js` - Basic static routes
- `generate-dynamic-sitemap.js` - Dynamic content from Supabase

Edit these files to:
- Change sitemap priorities
- Update change frequencies
- Add or remove routes
- Configure image data
- Add alternate language versions

## Troubleshooting

If the dynamic sitemap generator fails (due to database connection issues), it will fall back to generating basic static sitemaps.
