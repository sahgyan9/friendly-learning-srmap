function extractRegistrationLink(html) {
  if (!html) return null;

  // 1. Look for zoom_link / webinar_links / elementor button
  const zoomLinkMatch = html.match(/class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["']/i);

  if (zoomLinkMatch && isValidExternalLink(zoomLinkMatch[1])) {
    return { url: zoomLinkMatch[1], source: "button_class" };
  }

  // 2. Look for explicit forms / registration platforms in hrefs
  const formPatterns = [
    /href=["'](https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|forms\.office\.com|unstop\.com|devfolio\.co|lu\.ma|eventbrite\.com)[^"']*)["']/i,
    /href=["'](https?:\/\/[^"']*(?:register|registration|rsvp|webinar)[^"']*)["']/i
  ];

  for (const pattern of formPatterns) {
    const match = html.match(pattern);
    if (match && isValidExternalLink(match[1])) {
      return { url: match[1], source: "pattern_match" };
    }
  }

  // 3. Look for anchor tags with "Register", "RSVP", "Join", "Apply" text
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRegex.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (
      (text.includes("register") || text.includes("rsvp") || text.includes("sign up") || text.includes("join now")) &&
      isValidExternalLink(href)
    ) {
      return { url: href, source: "anchor_text", label: m[2].replace(/<[^>]+>/g, "").trim() };
    }
  }

  return null;
}

function isValidExternalLink(url) {
  if (!url || url.startsWith("#") || url.startsWith("javascript:")) return false;
  if (url.includes("events.srmap.edu.in/feed") || url.includes("events.srmap.edu.in/comments")) return false;
  if (url.includes("wp-content") || url.includes("wp-includes") || url.includes("wp-json")) return false;
  if (url.endsWith(".css") || url.endsWith(".js") || url.endsWith(".png") || url.endsWith(".jpg")) return false;
  return true;
}

async function run() {
  console.log("Fetching live events list from Tribe V1 REST API...");
  const listRes = await fetch("https://events.srmap.edu.in/wp-json/tribe/events/v1/events?per_page=15");
  const listData = await listRes.json();
  const events = listData.events || [];

  console.log(`Analyzing ${events.length} events:\n`);

  for (const e of events) {
    console.log(`------------------------------------------------`);
    console.log(`[#${e.id}] ${e.title}`);
    console.log(`📅 Dates: ${e.start_date} -> ${e.end_date}`);
    console.log(`📍 Venue: ${e.venue?.venue || "Campus / N/A"}`);
    console.log(`👤 Organizer: ${e.organizer?.[0]?.organizer || "SRMAP"}`);

    // Fetch the single page HTML to check for registration button/link
    try {
      const pageRes = await fetch(e.url);
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const regInfo = extractRegistrationLink(pageHtml);
        if (regInfo) {
          console.log(`🎯 Registration Link Detected: ${regInfo.url} (via ${regInfo.source})`);
        } else {
          console.log(`ℹ️  No external registration link (Open Attendance / Department Info Session)`);
        }
      }
    } catch (err) {
      console.log(`⚠️  Could not fetch single page: ${err.message}`);
    }
  }
}

run();
