async function inspectRegistrationButton() {
  const url = "https://events.srmap.edu.in/event/the-future-runs-on-electricity-why-electrical-engineers-will-shape-the-world/";
  const res = await fetch(url);
  const html = await res.text();
  
  // Find where forms.gle or zoom_link is
  const formIdx = html.indexOf("forms.gle");
  if (formIdx !== -1) {
    console.log("Snippet around forms.gle:\n", html.slice(formIdx - 200, formIdx + 300));
  }

  const zoomIdx = html.indexOf("zoom_link");
  if (zoomIdx !== -1) {
    console.log("\nSnippet around zoom_link:\n", html.slice(zoomIdx - 100, zoomIdx + 300));
  }
}

inspectRegistrationButton();
