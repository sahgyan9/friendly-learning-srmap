const TRIBE_V1_API = "https://events.srmap.edu.in/wp-json/tribe/events/v1/events?per_page=50";

function isValidRegistrationLink(url, currentEventUrl) {
  if (!url || url.startsWith("#") || url.startsWith("javascript:")) return false;
  if (url === currentEventUrl || url === currentEventUrl + "/") return false;
  if (url.includes("events.srmap.edu.in/feed") || url.includes("events.srmap.edu.in/comments") || url.includes("events.srmap.edu.in/events/")) return false;
  if (url.includes("wp-content") || url.includes("wp-includes") || url.includes("wp-json") || url.includes("xmlrpc.php")) return false;
  if (url.endsWith(".css") || url.endsWith(".js") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".webp")) return false;
  return true;
}

function extractRegistrationLink(html, currentEventUrl) {
  if (!html) return null;

  const zoomLinkMatch = html.match(/class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["']/i);

  if (zoomLinkMatch && isValidRegistrationLink(zoomLinkMatch[1], currentEventUrl)) {
    return { url: zoomLinkMatch[1], label: "Register Now" };
  }

  const formPatterns = [
    /href=["'](https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|forms\.office\.com|unstop\.com|devfolio\.co|lu\.ma|eventbrite\.com)[^"']*)["']/i,
    /href=["'](https?:\/\/[^"']*(?:register|registration|forms)[^"']*)["']/i
  ];

  for (const pattern of formPatterns) {
    const match = html.match(pattern);
    if (match && isValidRegistrationLink(match[1], currentEventUrl)) {
      return { url: match[1], label: "Register on Campus Portal" };
    }
  }

  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRegex.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (
      (text === "register" || text === "register now" || text === "rsvp" || text === "sign up" || text === "apply now" || text.includes("registration link")) &&
      isValidRegistrationLink(href, currentEventUrl)
    ) {
      return { url: href, label: m[2].replace(/<[^>]+>/g, "").trim() };
    }
  }

  return null;
}

function cleanHtml(html) {
  if (!html) return "";
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
}

async function generateBackfillSql() {
  console.log("Fetching live events from Tribe V1...");
  const res = await fetch(TRIBE_V1_API);
  const data = await res.json();
  const events = data.events || [];
  console.log(`Fetched ${events.length} events.`);

  const updateStatements = [];

  for (const e of events) {
    let regUrl = null;
    let regLabel = null;

    try {
      const pageRes = await fetch(e.url);
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const reg = extractRegistrationLink(pageHtml, e.url);
        if (reg) {
          regUrl = reg.url;
          regLabel = reg.label;
        }
      }
    } catch {
      // ignore
    }

    const venue = e.venue?.venue || null;
    const organizer = e.organizer?.[0]?.organizer || null;
    const content = cleanHtml(e.description || "");

    const escapeSql = (str) => {
      if (str === null || str === undefined) return "NULL";
      return `'${String(str).replace(/'/g, "''")}'`;
    };

    updateStatements.push(`
UPDATE public.srmap_events_cache
SET
  content = ${escapeSql(content)},
  venue = ${escapeSql(venue)},
  organizer = ${escapeSql(organizer)},
  registration_url = ${escapeSql(regUrl)},
  registration_label = ${escapeSql(regLabel)}
WHERE id = ${e.id};
    `.trim());
  }

  const fullSql = updateStatements.join("\n\n");
  console.log("Generated SQL updates for", events.length, "events.");
  return fullSql;
}

generateBackfillSql().then(sql => {
  import("fs").then(fs => {
    fs.writeFileSync("supabase/migrations/temp_backfill.sql", sql);
    console.log("Written to supabase/migrations/temp_backfill.sql");
  });
});
