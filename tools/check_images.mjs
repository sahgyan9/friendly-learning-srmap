async function run() {
  const res = await fetch("https://events.srmap.edu.in/wp-json/tribe/events/v1/events?per_page=50");
  const data = await res.json();
  data.events.forEach((e) => {
    const m = e.description ? e.description.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
    console.log(`[Event ${e.id}] "${e.title.slice(0, 30)}"`);
    console.log(`  Featured: ${e.image?.url || "NONE"}`);
    console.log(`  Content Poster: ${m ? m[1] : "NONE"}\n`);
  });
}
run();
