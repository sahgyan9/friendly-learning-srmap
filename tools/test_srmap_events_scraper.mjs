const TRIBE_V1_API = "https://events.srmap.edu.in/wp-json/tribe/events/v1/events?per_page=20";
const WP_V2_API = "https://events.srmap.edu.in/wp-json/wp/v2/tribe_events?per_page=20&_embed=1&order=desc";

async function testBothScrapers() {
  console.log("=== 1. TESTING TRIBE V1 REST API ===");
  try {
    const res = await fetch(TRIBE_V1_API);
    const data = await res.json();
    console.log(`Tribe V1 returned ${data.events?.length || 0} events. Total in DB: ${data.total}`);

    for (const e of (data.events || []).slice(0, 5)) {
      console.log("\n------------------------------------------------");
      console.log(`[#${e.id}] ${e.title}`);
      console.log(`📅 Start: ${e.start_date} | End: ${e.end_date}`);
      console.log(`📍 Venue: ${e.venue?.venue || "N/A"}`);
      console.log(`👤 Organizer: ${e.organizer?.[0]?.organizer || "N/A"}`);
      console.log(`🌐 Website/Link: ${e.url}`);
      console.log(`🔗 Reg Website field: ${e.website || "N/A"}`);
      
      // Extract links from description
      const links = [];
      const linkRegex = /href=["']([^"']+)["']/gi;
      let m;
      while ((m = linkRegex.exec(e.description || "")) !== null) {
        links.push(m[1]);
      }
      console.log(`📝 Description Links (${links.length}):`, links);
      
      const sampleText = (e.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
      console.log(`📄 Snippet: ${sampleText}...`);
    }
  } catch (err) {
    console.error("Tribe V1 failed:", err);
  }

  console.log("\n\n=== 2. TESTING DIRECT EVENT SCRAPING (REGISTRATION LINKS DETECTION) ===");
  try {
    const res = await fetch(TRIBE_V1_API);
    const data = await res.json();
    
    let totalWithRegLinks = 0;
    for (const e of (data.events || [])) {
      const allTextAndHtml = (e.description || "") + " " + (e.website || "");
      const links = [];
      const linkRegex = /href=["']([^"']+)["']/gi;
      let m;
      while ((m = linkRegex.exec(e.description || "")) !== null) {
        links.push(m[1]);
      }
      if (e.website) links.push(e.website);

      // Find registration forms or links
      const forms = links.filter(l => 
        /forms\.gle|docs\.google\.com\/forms|unstop|devfolio|tinyurl|bit\.ly|register|forms\.office|srmap\.edu\.in.*register/i.test(l)
      );

      if (forms.length > 0) {
        totalWithRegLinks++;
        console.log(`Event #${e.id} "${e.title}": Found Registration Form Link(s) ->`, forms);
      }
    }
    console.log(`\nFound registration form links in ${totalWithRegLinks} of ${(data.events || []).length} tested events.`);
  } catch (err) {
    console.error("Link analysis failed:", err);
  }
}

testBothScrapers();
