import fs from 'fs';
import path from 'path';

async function combineAndPrepareBlocks() {
  const tmpDir = '.tmp';
  const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('enrich_batch_') && f.endsWith('.sql'));

  const allUpdates = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(tmpDir, f), 'utf8');
    const statements = content.split('\n').filter(l => l.trim().startsWith('UPDATE'));
    allUpdates.push(...statements);
  }

  console.log(`Total UPDATE statements loaded: ${allUpdates.length}`);

  const CHUNK_SIZE = 50;
  const blocks = [];

  for (let i = 0; i < allUpdates.length; i += CHUNK_SIZE) {
    const chunk = allUpdates.slice(i, i + CHUNK_SIZE);
    const plsql = `DO $$\nBEGIN\n${chunk.join('\n')}\nEND $$;`;
    blocks.push(plsql);
  }

  fs.writeFileSync('.tmp/plpgsql_blocks.json', JSON.stringify(blocks, null, 2));
  console.log(`Generated ${blocks.length} PL/pgSQL blocks in .tmp/plpgsql_blocks.json`);
}

combineAndPrepareBlocks();
