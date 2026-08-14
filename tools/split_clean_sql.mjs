import fs from 'fs';

const sql = fs.readFileSync('.tmp/master_clean_enrichment.sql', 'utf8');
const statements = sql
  .split(';\n')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

console.log(`Loaded ${statements.length} statements.`);

// 8 blocks of ~78 statements each (~20KB each)
const BATCH = 78;
const blocks = [];
for (let i = 0; i < statements.length; i += BATCH) {
  const chunk = statements.slice(i, i + BATCH);
  blocks.push(`DO $$\nBEGIN\n${chunk.join(';\n')};\nEND $$;`);
}

console.log(`Generated ${blocks.length} blocks.`);
blocks.forEach((b, i) => {
  fs.writeFileSync(`.tmp/clean_chunk_${i}.sql`, b);
  console.log(`Chunk ${i}: ${b.length} bytes`);
});
fs.writeFileSync('.tmp/clean_chunks_all.json', JSON.stringify(blocks));
