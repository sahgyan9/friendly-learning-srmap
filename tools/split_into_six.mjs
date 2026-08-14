import fs from 'fs';

const sql = fs.readFileSync('.tmp/master_clean_enrichment.sql', 'utf8');
const statements = sql
  .split(';\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT') && !s.startsWith('GRANT'));

console.log(`Total update statements: ${statements.length}`);

// Split into 6 parts (~105 statements each)
const BATCH = 105;
const parts = [];
for (let i = 0; i < statements.length; i += BATCH) {
  let p = statements.slice(i, i + BATCH).join(';\n') + ';\n';
  if (i + BATCH >= statements.length) {
    p += '\nGRANT SELECT ON public.faculty TO anon, authenticated;\nSELECT rebuild_faculty_chunks();\n';
  }
  parts.push(p);
}

console.log(`Created ${parts.length} parts.`);
parts.forEach((p, idx) => {
  fs.writeFileSync(`.tmp/p${idx}.sql`, p);
  console.log(`Part ${idx}: ${p.length} bytes`);
});
fs.writeFileSync('.tmp/all_six_parts.json', JSON.stringify(parts));
