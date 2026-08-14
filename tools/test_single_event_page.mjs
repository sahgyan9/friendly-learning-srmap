async function testSingleEventPageScraping() {
  const testUrls = [
    "https://events.srmap.edu.in/event/guest-expert-lecture-series-applicable-indian-ehs-regulations-supporting-circular-economy/",
    "https://events.srmap.edu.in/event/146285/",
    "https://events.srmap.edu.in/event/the-future-runs-on-electricity-why-electrical-engineers-will-shape-the-world/",
    "https://events.srmap.edu.in/event/nano2nature-n2n-research-bootcamp/"
  ];

  for (const url of testUrls) {
    console.log("\n================================================");
    console.log("Fetching webpage:", url);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    console.log(`Downloaded ${html.length} chars.`);

    // Extract any button, form, iframe, or registration links in the webpage HTML
    const linkRegex = /href=["']([^"']+)["']/gi;
    const allLinks = [];
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      allLinks.push(m[1]);
    }

    // Filter external / interesting links
    const relevantLinks = allLinks.filter(l => 
      !l.includes("wp-content") && 
      !l.includes("wp-includes") && 
      !l.includes("yoast") && 
      !l.includes("wp-json") &&
      !l.endsWith(".css") &&
      !l.endsWith(".js")
    );

    console.log("Relevant links found on page:", relevantLinks);

    // Look for registration text, buttons, forms, iframe
    const regMatches = html.match(/(?:register|registration|rsvp|join|zoom|meet\.google)[^<]{0,50}/gi) || [];
    console.log("Registration / RSVP mentions:", regMatches.slice(0, 5));

    // Look for embedded iframes (e.g. Google forms, YouTube, etc.)
    const iframes = html.match(/<iframe[^>]+>/gi) || [];
    console.log("Iframes on page:", iframes);
  }
}

testSingleEventPageScraping();
