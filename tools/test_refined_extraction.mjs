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

  // 1. Look for zoom_link / webinar_links / elementor button
  const zoomLinkMatch = html.match(/class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["']/i);

  if (zoomLinkMatch && isValidRegistrationLink(zoomLinkMatch[1], currentEventUrl)) {
    return { url: zoomLinkMatch[1], source: "button_class" };
  }

  // 2. Look for explicit forms / registration platforms in hrefs
  const formPatterns = [
    /href=["'](https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|forms\.office\.com|unstop\.com|devfolio\.co|lu\.ma|eventbrite\.com)[^"']*)["']/i,
    /href=["'](https?:\/\/[^"']*(?:register|registration|forms)[^"']*)["']/i
  ];

  for (const pattern of formPatterns) {
    const match = html.match(pattern);
    if (match && isValidRegistrationLink(match[1], currentEventUrl)) {
      return { url: match[1], source: "form_pattern" };
    }
  }

  // 3. Look for anchor tags with "Register", "RSVP", "Join", "Apply" text
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRegex.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (
      (text === "register" || text === "register now" || text === "rsvp" || text === "sign up" || text === "apply now" || text.includes("registration link")) &&
      isValidRegistrationLink(href, currentEventUrl)
    ) {
      return { url: href, source: "anchor_text", label: m[2].replace(/<[^>]+>/g, "").trim() };
    }
  }

  return null;
}

async function testExtraction() {
  const listRes = await fetch("https://events.srmap.edu.in/wp-json/tribe/events/v1/events?per_page=15");
  const listData = await listRes.json();
  const events = listData.events || [];

  const verified = [];
  for (const e of events) {
    const pageRes = await fetch(e.url);
    const html = pageRes.ok ? await pageRes.text() : "";
    const reg = extractRegistrationLink(html, e.url);
    verified.push({
      id: e.id,
      title: e.title,
      dates: `${e.start_date} to ${e.end_date}`,
      venue: e.venue?.venue || "Campus",
      organizer: e.organizer?.[0]?.organizer || "SRMAP",
      registrationUrl: reg?.url || null
    });
  }

  console.log("Verified extraction summary:");
  console.table(verified);
}

testExtraction();
