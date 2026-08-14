import { scrapeFacultyResearchDetails } from './scrape_faculty_research.mjs';

// Batch sync script to enrich faculty data in Supabase database

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

async function fetchFacultyList() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?select=id,slug,name,department,profile_url,email,office_location,research_details&is_active=eq.true&order=rating_count.desc,name.asc`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function runBatchSync(limit = 15) {
  console.log('Fetching active faculty list from Supabase...');
  const list = await fetchFacultyList();
  console.log(`Total active faculty in database: ${list.length}`);

  const targetBatch = list.slice(0, limit);
  console.log(`Processing batch of ${targetBatch.length} faculty members...\n`);

  const updates = [];

  for (let i = 0; i < targetBatch.length; i++) {
    const fac = targetBatch[i];
    const url = fac.profile_url || `https://www.srmap.edu.in/faculty/${fac.slug}/`;
    console.log(`[${i + 1}/${targetBatch.length}] Scraping ${fac.name} (${fac.department})...`);
    console.log(`  URL: ${url}`);

    const details = await scrapeFacultyResearchDetails(url);

    const emailToSave = details.email || null;
    const officeToSave = details.officeLocation || null;
    const researchToSave = details.researchPoints.length > 0 ? details.researchPoints : null;

    console.log(`  -> Email: ${emailToSave || 'N/A'}`);
    console.log(`  -> Office: ${officeToSave || 'N/A'}`);
    console.log(`  -> Research Points: ${researchToSave ? researchToSave.length : 0}`);

    updates.push({
      id: fac.id,
      name: fac.name,
      slug: fac.slug,
      email: emailToSave,
      office_location: officeToSave,
      research_details: researchToSave
    });

    // Small delay to be polite to the university server
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n--- BATCH UPDATE STATS ---');
  console.log(`Successfully scraped ${updates.length} faculty members.`);
  console.log(JSON.stringify(updates.slice(0, 3), null, 2));

  // Write SQL script to .tmp/batch_update.sql
  let sql = `-- Batch update faculty details\n`;
  for (const item of updates) {
    const emailEsc = item.email ? `'${item.email.replace(/'/g, "''")}'` : 'NULL';
    const officeEsc = item.office_location ? `'${item.office_location.replace(/'/g, "''")}'` : 'NULL';
    let researchEsc = 'NULL';
    if (item.research_details && item.research_details.length > 0) {
      const arr = item.research_details.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
      researchEsc = `ARRAY[${arr}]`;
    }
    sql += `UPDATE public.faculty SET email = COALESCE(${emailEsc}, email), office_location = ${officeEsc}, research_details = ${researchEsc}, updated_at = now() WHERE id = '${item.id}';\n`;
  }

  console.log('\nGenerated SQL file at .tmp/batch_update.sql');
  return { updates, sql };
}

runBatchSync(20);
