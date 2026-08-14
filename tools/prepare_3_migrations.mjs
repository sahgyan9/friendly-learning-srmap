import fs from 'fs';

const sql = fs.readFileSync('.tmp/final_faculty_enrichment_migration.sql', 'utf8');
const statements = sql
  .split(';\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT') && !s.startsWith('GRANT'));

console.log(`Total update statements: ${statements.length}`);

// Split into 3 parts (~209 statements each)
const p1 = statements.slice(0, 210).join(';\n') + ';\n';
const p2 = statements.slice(210, 420).join(';\n') + ';\n';
const p3 = statements.slice(420).join(';\n') + ';\nGRANT SELECT ON public.faculty TO anon, authenticated;\nSELECT rebuild_faculty_chunks();\n';

fs.writeFileSync('.tmp/mig_part1.sql', p1);
fs.writeFileSync('.tmp/mig_part2.sql', p2);
fs.writeFileSync('.tmp/mig_part3.sql', p3);

console.log(`Part 1: ${p1.length} bytes (${statements.slice(0, 210).length} updates)`);
console.log(`Part 2: ${p2.length} bytes (${statements.slice(210, 420).length} updates)`);
console.log(`Part 3: ${p3.length} bytes (${statements.slice(420).length} updates)`);
