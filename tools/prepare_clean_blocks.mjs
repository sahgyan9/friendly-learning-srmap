import fs from 'fs';

const sql = fs.readFileSync('.tmp/master_clean_enrichment.sql', 'utf8');
const statements = sql
  .split(';\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

console.log(`Statements count: ${statements.length}`);

// Split into 4 DO $$ BEGIN ... END $$ blocks (~150 statements each)
const BATCH = 160;
const blocks = [];
for (let i = 0; i < statements.length; i += BATCH) {
  const batchStatements = statements.slice(i, i + BATCH);
  const block = `DO $$\nBEGIN\n${batchStatements.join(';\n')};\nEND $$;`;
  blocks.push(block);
}

console.log(`Created ${blocks.length} DO blocks.`);
for (let i = 0; i < blocks.length; i++) {
  fs.writeFileSync(`.tmp/clean_block_${i}.sql`, blocks[i]);
  console.log(`Block ${i}: ${blocks[i].length} bytes`);
}
