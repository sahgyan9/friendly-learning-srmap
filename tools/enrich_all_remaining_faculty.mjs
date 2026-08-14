import { scrapeFacultyResearchDetails } from './scrape_faculty_research.mjs';

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

async function fetchUnenrichedFaculty() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?select=id,slug,name,department,profile_url,email,office_location,research_details&is_active=eq.true&office_location=is.null&order=name.asc`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function runEnrichment() {
  console.log('Fetching list of faculty needing enrichment from Supabase...');
  const pending = await fetchUnenrichedFaculty();
  console.log(`Faculty profiles needing enrichment: ${pending.length}`);

  if (pending.length === 0) {
    console.log('All faculty profiles are already enriched!');
    return;
  }

  const BATCH_SIZE = 15;
  let successCount = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    console.log(`\n[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pending.length / BATCH_SIZE)}] Processing ${chunk.length} faculty members...`);

    const sqlStatements = [];

    await Promise.all(
      chunk.map(async (fac) => {
        const url = fac.profile_url || `https://www.srmap.edu.in/faculty/${fac.slug}/`;
        const data = await scrapeFacultyResearchDetails(url);

        const emailVal = data.email && data.email !== 'info@srmap.edu.in' ? data.email : null;
        const officeVal = data.officeLocation || null;
        const researchVal = data.researchPoints.length > 0 ? data.researchPoints : null;

        if (emailVal || officeVal || researchVal) {
          const emailEsc = emailVal ? `'${emailVal.replace(/'/g, "''")}'` : 'email';
          const officeEsc = officeVal ? `'${officeVal.replace(/'/g, "''")}'` : 'office_location';
          let researchEsc = 'research_details';
          if (researchVal && researchVal.length > 0) {
            const arr = researchVal.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
            researchEsc = `ARRAY[${arr}]`;
          }

          sqlStatements.push(
            `UPDATE public.faculty SET email = COALESCE(${emailEsc}, email), office_location = COALESCE(${officeEsc}, office_location), research_details = COALESCE(${researchEsc}, research_details), updated_at = now() WHERE id = '${fac.id}';`
          );
        }
      })
    );

    if (sqlStatements.length > 0) {
      const fs = await import('fs');
      const batchFile = `.tmp/enrich_batch_${Math.floor(i / BATCH_SIZE)}.sql`;
      fs.writeFileSync(batchFile, sqlStatements.join('\n'));
      console.log(`Wrote ${sqlStatements.length} updates to ${batchFile}`);
    }

    successCount += chunk.length;
    console.log(`Progress: ${successCount} / ${pending.length} faculty scraped.`);

    // Polite delay between batches
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nAll faculty scraping completed!');
}

runEnrichment();
