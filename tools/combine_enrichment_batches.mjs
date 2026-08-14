import fs from 'fs';
import path from 'path';

async function combineAndApply() {
  const tmpDir = '.tmp';
  const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('enrich_batch_') && f.endsWith('.sql'));
  console.log(`Found ${files.length} batch SQL files.`);

  let fullSql = `-- Master faculty enrichment update\n`;
  for (const f of files) {
    const content = fs.readFileSync(path.join(tmpDir, f), 'utf8');
    fullSql += content + '\n';
  }

  // Also append vector chunk rebuild call
  fullSql += `\nSELECT rebuild_faculty_chunks();\n`;

  fs.writeFileSync('.tmp/master_enrichment.sql', fullSql);
  console.log(`Combined ${files.length} batches into .tmp/master_enrichment.sql (${fullSql.length} bytes)`);
}

combineAndApply();
