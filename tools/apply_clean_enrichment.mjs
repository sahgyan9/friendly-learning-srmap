import fs from 'fs';

// Read all SQL statements from master
const sql = fs.readFileSync('.tmp/master_clean_enrichment.sql', 'utf8');
const statements = sql
  .split(';\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Total valid SQL statements to execute: ${statements.length}`);

// Batch into groups of 35 statements
const groups = [];
const BATCH = 35;
for (let i = 0; i < statements.length; i += BATCH) {
  groups.push(statements.slice(i, i + BATCH).join(';\n') + ';');
}

fs.writeFileSync('.tmp/final_apply_groups.json', JSON.stringify(groups, null, 2));
console.log(`Saved ${groups.length} groups to .tmp/final_apply_groups.json`);
