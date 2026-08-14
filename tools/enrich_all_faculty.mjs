import fs from 'fs';
import { scrapeFacultyResearchDetails, isValidOfficeLocation } from './scrape_faculty_research.mjs';

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

async function fetchAllActiveFaculty() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?select=id,slug,name,department,profile_url,email,office_location,research_details&is_active=eq.true&order=name.asc`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function run() {
  console.log('Fetching all active faculty from Supabase...');
  const facultyList = await fetchAllActiveFaculty();
  console.log(`Total active faculty found: ${facultyList.length}`);

  const BATCH_SIZE = 30;
  const allSqlStatements = [];
  let enrichedCount = 0;
  let officeCleanedCount = 0;

  for (let i = 0; i < facultyList.length; i += BATCH_SIZE) {
    const chunk = facultyList.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(facultyList.length / BATCH_SIZE);
    console.log(`\n[Batch ${batchNum}/${totalBatches}] Scraping ${chunk.length} faculty members...`);

    await Promise.all(
      chunk.map(async (fac) => {
        const url = fac.profile_url || `https://www.srmap.edu.in/faculty/${fac.slug}/`;
        const scraped = await scrapeFacultyResearchDetails(url);

        const emailVal = scraped.email || null;
        let officeVal = scraped.officeLocation || null;
        const researchVal = scraped.researchPoints.length > 0 ? scraped.researchPoints : null;

        // Check if existing office_location in DB was corrupted with author citations
        const existingOfficeIsCorrupt = fac.office_location && !isValidOfficeLocation(fac.office_location);
        if (existingOfficeIsCorrupt && !officeVal) {
          officeCleanedCount++;
        }

        // Determine final values
        const finalEmailSql = emailVal ? `'${emailVal.replace(/'/g, "''")}'` : 'email';
        
        let finalOfficeSql;
        if (officeVal) {
          finalOfficeSql = `'${officeVal.replace(/'/g, "''")}'`;
        } else if (existingOfficeIsCorrupt) {
          finalOfficeSql = 'NULL';
        } else {
          finalOfficeSql = 'office_location';
        }

        let finalResearchSql = 'research_details';
        if (researchVal && researchVal.length > 0) {
          const arr = researchVal.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
          finalResearchSql = `ARRAY[${arr}]`;
        }

        const sql = `UPDATE public.faculty SET email = COALESCE(${finalEmailSql}, email), office_location = ${finalOfficeSql}, research_details = COALESCE(${finalResearchSql}, research_details), updated_at = now() WHERE id = '${fac.id}';`;
        allSqlStatements.push(sql);
        enrichedCount++;
      })
    );

    console.log(`Progress: ${enrichedCount} / ${facultyList.length} faculty processed.`);
    // Polite delay between batches
    await new Promise(r => setTimeout(r, 400));
  }

  // Combine into SQL blocks for execution
  const masterSql = `-- Master faculty enrichment & cleanup update\n` + allSqlStatements.join('\n') + `\n\nSELECT rebuild_faculty_chunks();\n`;
  fs.writeFileSync('.tmp/master_clean_enrichment.sql', masterSql);
  console.log(`\nSaved ${allSqlStatements.length} updates to .tmp/master_clean_enrichment.sql (${masterSql.length} bytes)`);
  console.log(`Total corrupted office locations queued for cleanup: ${officeCleanedCount}`);

  // Split into chunks of 50 statements for reliable MCP SQL execution
  const CHUNK_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < allSqlStatements.length; i += CHUNK_SIZE) {
    chunks.push(allSqlStatements.slice(i, i + CHUNK_SIZE).join('\n'));
  }
  fs.writeFileSync('.tmp/clean_enrichment_chunks.json', JSON.stringify(chunks, null, 2));
  console.log(`Split into ${chunks.length} manageable chunks in .tmp/clean_enrichment_chunks.json`);
}

run();
