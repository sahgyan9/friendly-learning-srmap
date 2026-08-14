import { parse } from "node-html-parser";

async function scrapeEventPage(eventUrl) {
  try {
    const res = await fetch(eventUrl);
    if (!res.ok) return null;
    const html = await res.text();
    const root = parse(html);

    // 1. Extract Registration Link
    let registrationUrl = null;
    let registrationLabel = null;

    // Check webinar_links / zoom_link / register buttons
    const regButtons = root.querySelectorAll(".webinar_links a, a.zoom_link, a.btn, a[href*='forms.gle'], a[href*='docs.google.com/forms'], a[href*='forms.office.com'], a[href*='unstop.com']");
    for (const btn of regButtons) {
      const href = btn.getAttribute("href");
      const text = btn.text.trim();
      if (href && !href.startsWith("#") && !href.includes("javascript:")) {
        registrationUrl = href;
        registrationLabel = text || "Register Now";
        break;
      }
    }

    // Fallback: search all anchors with text matching Register / RSVP
    if (!registrationUrl) {
      const allAnchors = root.querySelectorAll("a");
      for (const a of allAnchors) {
        const text = a.text.trim().toLowerCase();
        const href = a.getAttribute("href");
        if (href && (text.includes("register") || text.includes("rsvp") || text.includes("sign up") || text.includes("join webinar"))) {
          if (!href.includes("events.srmap.edu.in/events") && !href.startsWith("#")) {
            registrationUrl = href;
            registrationLabel = a.text.trim() || "Register Now";
            break;
          }
        }
      }
    }

    // 2. Extract Venue & Details
    const venueElem = root.querySelector(".tribe-events-venue-details, .tribe-venue, .event_venue, .tribe-events-single-section-venue");
    const venue = venueElem ? venueElem.text.replace(/\s+/g, " ").trim() : null;

    // 3. Extract Organizer
    const organizerElem = root.querySelector(".tribe-events-organizer, .tribe-organizer, .event_organizer, .tribe-events-single-section-organizer");
    const organizer = organizerElem ? organizerElem.text.replace(/\s+/g, " ").trim() : null;

    // 4. Extract Main Content / Description (clean article body)
    const contentElem = root.querySelector(".tribe-events-single-event-description, .eventDetail_left_sec, .entry-content");
    const cleanContent = contentElem ? contentElem.innerHTML : "";

    return {
      url: eventUrl,
      registrationUrl,
      registrationLabel,
      venue,
      organizer,
      hasContent: Boolean(cleanContent)
    };
  } catch (err) {
    console.error(`Failed to scrape ${eventUrl}:`, err.message);
    return null;
  }
}

async function run() {
  console.log("Fetching live events list from REST API...");
  const listRes = await fetch("https://events.srmap.edu.in/wp-json/tribe/events/v1/events?per_page=10");
  const listData = await listRes.json();
  const events = listData.events || [];

  console.log(`Analyzing ${events.length} events:\n`);

  for (const e of events) {
    const scraped = await scrapeEventPage(e.url);
    console.log(`[Event #${e.id}] ${e.title}`);
    console.log(`  🌐 Page: ${e.url}`);
    console.log(`  📍 Venue (from API): ${e.venue?.venue || "N/A"}`);
    console.log(`  👤 Organizer (from API): ${e.organizer?.[0]?.organizer || "N/A"}`);
    console.log(`  🎯 Scraped Reg Link: ${scraped?.registrationUrl || "None (Open Attendance / Department Info)"}`);
    if (scraped?.registrationUrl) {
      console.log(`  🏷️  Reg Button Text: "${scraped.registrationLabel}"`);
    }
    console.log("");
  }
}

run();
