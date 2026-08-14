import fs from 'fs';

async function splitMasterSql() {
  const masterContent = fs.readFileSync('.tmp/master_enrichment.sql', 'utf8');
  const lines = masterContent.split('\n').filter(l => l.trim().startsWith('UPDATE'));

  console.log(`Total UPDATE statements to execute: ${lines.length}`);

  const CHUNK_SIZE = 150;
  const totalChunks = Math.ceil(lines.length / CHUNK_SIZE);

  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    const batch = lines.slice(i, i + CHUNK_SIZE);
    const chunkSql = batch.join('\n') + '\nSELECT rebuild_faculty_chunks();\n';
    const chunkFileName = `.tmp/final_chunk_${Math.floor(i / CHUNK_SIZE)}.sql`;
    fs.writeFileSync(chunkFileName, chunkSql);
    console.log(`Wrote ${batch.length} statements to ${chunkFileName}`);
  }
}

splitMasterSql();
