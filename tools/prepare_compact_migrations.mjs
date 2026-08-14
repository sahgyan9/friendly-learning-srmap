import fs from 'fs';

const sql = fs.readFileSync('.tmp/master_clean_enrichment.sql', 'utf8');
const statements = sql
  .split(';\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT') && !s.startsWith('GRANT'));

// Filter out no-op statements
const noOpPattern = /email\s*=\s*COALESCE\(email,\s*email\),\s*office_location\s*=\s*office_location,\s*research_details\s*=\s*COALESCE\(research_details,\s*research_details\)/;

const activeStatements = statements.filter(s => !noOpPattern.test(s));

console.log(`Total statements: ${statements.length}`);
console.log(`Active statements requiring DB update/cleanup: ${activeStatements.length}`);

// Combine active statements with Grants and vector chunk rebuild
const fullActiveMigration = `-- Active Faculty Enrichment & Office Location Cleanup
DO $$
BEGIN
${activeStatements.join(';\n')};
END $$;

GRANT SELECT ON public.faculty TO anon, authenticated;
SELECT rebuild_faculty_chunks();
`;

fs.writeFileSync('.tmp/compact_active_migration.sql', fullActiveMigration);
console.log(`Saved compact active migration (${fullActiveMigration.length} bytes) to .tmp/compact_active_migration.sql`);
