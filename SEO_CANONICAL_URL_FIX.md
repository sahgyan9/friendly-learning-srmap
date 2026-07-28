# SEO Canonical URL Issues - FIXED

> **Historical.** This records a past debugging session and describes a
> two-domain setup (`friendly-learning-srmap.lovable.app` plus
> `www.project-fl.me`) that no longer exists. The site now serves a single
> canonical origin defined in `site.config.js`. Kept for context on why the SEO
> code is shaped the way it is; do not follow its instructions.


## Issues Identified from Google Search Console

### 1. **MarketPlace Page Missing SEO Head**
- **Issue**: `/marketplace` page had no `SEOHead` component, causing missing canonical URL
- **Solution**: Added `SEOHead` component with proper meta tags and canonical URL

### 2. **Canonical URL Domain Conflicts** 
- **Issue**: Inconsistent canonical URLs between sitemaps and page meta tags
  - Sitemaps used: `https://friendly-learning-srmap.lovable.app`
  - Page canonicals used: `https://www.project-fl.me`
- **Solution**: Standardized all URLs to use `https://friendly-learning-srmap.lovable.app` as primary domain

### 3. **Community Posts Sitemap Reference Issues**
- **Issue**: Google couldn't find referring sitemaps for `/community-posts`
- **Solution**: Updated sitemap generation to ensure consistent domain usage

## Changes Made

### 1. Updated MarketPlace Page (`src/pages/MarketPlace.tsx`)
- Added missing imports: `SEOHead`, `StructuredData`, `getBreadcrumbSchema`
- Added SEO meta tags with title, description, keywords
- Set canonical URL to `https://friendly-learning-srmap.lovable.app/marketplace`
- Added breadcrumb structured data

### 2. Updated Canonical URL Strategy (`src/components/SEOHead.tsx`)
- Changed primary domain to `friendly-learning-srmap.lovable.app`
- Updated canonical URL logic to always prefer Lovable domain
- Fixed alternate domain references
- Updated structured data to use consistent URLs

### 3. Updated Page Canonical URLs
- **Mentors page**: `https://friendly-learning-srmap.lovable.app/mentors`
- **Community Posts**: `https://friendly-learning-srmap.lovable.app/community-posts`
- **About page**: `https://friendly-learning-srmap.lovable.app/about`
- **Blog page**: `https://friendly-learning-srmap.lovable.app/blog`
- **How It Works**: `https://friendly-learning-srmap.lovable.app/how-it-works`
- **Community Post Details**: Updated to use Lovable domain

### 4. Updated Sitemap Generation Scripts
- **generate-sitemap.js**: Changed siteUrl to Lovable domain
- **generate-dynamic-sitemap.js**: Changed siteUrl to Lovable domain
- Regenerated all sitemaps with consistent URLs

### 5. Regenerated Sitemaps
- **sitemap.xml**: Main site pages with Lovable domain
- **sitemap-mentors.xml**: 6 mentor profiles with Lovable domain
- **sitemap-community.xml**: 4 community posts with Lovable domain
- **sitemap-index.xml**: Updated to reference Lovable domain sitemaps

## Expected Google Search Console Improvements

1. **MarketPlace page** will now be indexed properly with canonical URL
2. **Community Posts** will be found in sitemaps correctly
3. **Canonical URL conflicts** will be resolved - Google will see consistent preferred URLs
4. **Duplicate content issues** will be eliminated

## Next Steps

1. **Submit updated sitemaps** to Google Search Console
2. **Request re-indexing** for affected pages:
   - `/marketplace`
   - `/mentors`  
   - `/community-posts`
3. **Monitor indexing status** over the next 1-2 weeks
4. **Verify canonical URLs** are being respected by Google

## Technical Notes

- All URLs now consistently use `https://friendly-learning-srmap.lovable.app` as the canonical domain
- `www.project-fl.me` is treated as an alternate domain
- Sitemaps and page meta tags are now perfectly aligned
- Added proper structured data and breadcrumbs for better SEO

The domain consistency fix should resolve the "Duplicate, Google chose different canonical than user" issues shown in Google Search Console.
