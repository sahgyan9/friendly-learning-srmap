import { scrapeFacultyResearchDetails } from './scrape_faculty_research.mjs';

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

async function fetchAllFaculty() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?select=id,slug,name,department,profile_url,email,office_location,research_details&is_active=eq.true&order=name.asc`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function runEnrichment() {
  console.log('Fetching list of active faculty from Supabase...');
  const facultyList = await fetchAllFaculty();
  console.log(`Loaded ${facultyList.length} faculty profiles.`);

  // Filter to ones that need enrichment (missing office_location or research_details)
  const pending = facultyList.filter(f => !f.office_location || !f.research_details || !f.email);
  console.log(`Faculty profiles requiring enrichment: ${pending.length}`);

  const BATCH_SIZE = 10;
  let processed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} profiles) ---`);

    const sqlUpdates = [];

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

          sqlUpdates.push(
            `UPDATE public.faculty SET email = COALESCE(${emailEsc}, email), office_location = COALESCE(${officeEsc}, office_location), research_details = COALESCE(${researchEsc}, research_details), updated_at = now() WHERE id = '${fac.id}';`
          );
        }
      })
    );

    if (sqlUpdates.length > 0) {
      const sqlBatch = sqlUpdates.join('\n');
      console.log(`Generated ${sqlUpdates.length} SQL update queries for current batch.`);
      // Save sqlBatch to batch file for execution
      const fs = await import('fs');
      fs.writeFileSync(`.tmp/batch_sql_${i}.sql`, sqlBatch);
      console.log(`Saved batch to .tmp/batch_sql_${i}.sql`);
    }

    processed += chunk.length;
    console.log(`Progress: ${processed} / ${pending.length} profiles processed.`);
    
    // Pause briefly between batches
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\nEnrichment complete!');
}

runEnrichment();
