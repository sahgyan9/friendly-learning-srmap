import fs from 'fs';

const cleanSql = fs.readFileSync('.tmp/master_clean_enrichment.sql', 'utf8');

const migration = `-- Faculty Enrichment and Office Location Cleanup Migration
-- Updates all active faculty profiles with clean scraped office locations,
-- emails, and detailed research statements from srmap.edu.in

${cleanSql}

-- Ensure anon and authenticated have SELECT on all faculty columns
GRANT SELECT ON public.faculty TO anon, authenticated;

-- Rebuild faculty vector search chunks
SELECT rebuild_faculty_chunks();
`;

fs.writeFileSync('.tmp/final_faculty_enrichment_migration.sql', migration);
console.log(`Generated migration (${migration.length} bytes)`);
