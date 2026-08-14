/**
 * Scrapes detailed research interests, office locations, and institutional email from SRM-AP faculty pages.
 */

export function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidOfficeLocation(loc) {
  if (!loc || typeof loc !== 'string') return false;
  const clean = decodeHtmlEntities(loc).trim();
  if (clean.length === 0 || clean.length > 70) return false;

  // Reject author citations (e.g. "Gupta K.K., Ricci C., Tortosa A.", "Das S., Bolar S.", "et al.")
  if (/,\s*[A-Z]\.\s*[A-Z]?\b/i.test(clean) || /\b(et\s+al|auth(or)?s?)\b/i.test(clean)) {
    return false;
  }
  // Reject publication / date metadata / HTML
  if (/\b(vol\.|no\.|pp\.|issn|isbn|doi:|journal|proc\.|conference)\b/i.test(clean)) {
    return false;
  }
  if (/^<|data-id|elementor|widget/i.test(clean)) {
    return false;
  }

  return true;
}

export async function scrapeFacultyResearchDetails(profileUrl) {
  try {
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      return { error: `HTTP ${res.status}`, researchPoints: [], officeLocation: null, email: null };
    }

    const html = await res.text();

    // 1. Email (institutional personal email only)
    let email = null;
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@srmap\.edu\.in)/i);
    if (emailMatch) {
      const found = emailMatch[1].toLowerCase().trim();
      const genericEmails = ['info@srmap.edu.in', 'admissions@srmap.edu.in', 'contact@srmap.edu.in', 'helpdesk@srmap.edu.in'];
      if (!genericEmails.includes(found)) {
        email = found;
      }
    }

    // 2. Office Location (must be within immediate 350 chars of "Office Location" header)
    let officeLocation = null;
    const officeIdx = html.indexOf('Office Location');
    if (officeIdx !== -1) {
      const officeSlice = html.slice(officeIdx, officeIdx + 350);
      const h5Match = officeSlice.match(/<h5[^>]*>(.*?)<\/h5>/i);
      if (h5Match) {
        const candidate = decodeHtmlEntities(h5Match[1].replace(/<[^>]+>/g, '').trim());
        if (isValidOfficeLocation(candidate)) {
          officeLocation = candidate;
        }
      }
    }

    // 3. Research Points
    let researchPoints = [];
    const resMatch = html.match(/<[^>]*id=["']Research["'][\s\S]*?(?=<div[^>]+id=["'](Awards|Memberships|Publications|Patents|Projects|Scholars|Contact)["']|<\/main|$)/i)
      || html.match(/id=["']Research["'][\s\S]*?(?=<div[^>]+id=["'](Awards|Memberships|Publications|Patents|Projects|Scholars|Contact)["']|<\/main|$)/i);

    if (resMatch) {
      const clean = resMatch[0]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n');

      researchPoints = clean
        .split('\n')
        .map((l) => decodeHtmlEntities(l.trim()))
        .filter(
          (l) =>
            l.length >= 15 &&
            l.length <= 400 &&
            !l.startsWith('id=') &&
            !l.startsWith('data-') &&
            !l.includes('Thought Leaderships') &&
            !l.includes('associated with this faculty') &&
            !l.includes('fast-evolving discipline') &&
            !l.includes('elementor-') &&
            !l.includes('Research Interest') &&
            !l.includes('Publications')
        );
    }

    // Fallback if Research section was empty
    if (researchPoints.length === 0) {
      const headingIdx = html.indexOf('Research Interest');
      if (headingIdx !== -1) {
        const slice = html.slice(headingIdx, headingIdx + 4000);
        const clean = slice
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '\n');

        researchPoints = clean
          .split('\n')
          .map((l) => decodeHtmlEntities(l.trim()))
          .filter(
            (l) =>
              l.length >= 15 &&
              l.length <= 400 &&
              !l.startsWith('id=') &&
              !l.startsWith('data-') &&
              !l.includes('Research Interest') &&
              !l.includes('elementor-') &&
              !l.includes('Publications')
          )
          .slice(0, 6);
      }
    }

    // Deduplicate
    researchPoints = Array.from(new Set(researchPoints));

    return {
      email,
      officeLocation,
      researchPoints,
    };
  } catch (err) {
    return { error: err.message, researchPoints: [], officeLocation: null, email: null };
  }
}

// Quick CLI runner
if (process.argv[1]?.endsWith('scrape_faculty_research.mjs')) {
  const testUrl = process.argv[2] || 'https://www.srmap.edu.in/faculty/dr-anuj-deshpande/';
  console.log(`Scraping research details for: ${testUrl}`);
  scrapeFacultyResearchDetails(testUrl).then((data) => {
    console.log(JSON.stringify(data, null, 2));
  });
}
