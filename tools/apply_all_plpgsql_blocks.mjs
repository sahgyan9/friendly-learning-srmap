import fs from 'fs';

async function applyBlocks() {
  const raw = fs.readFileSync('.tmp/plpgsql_blocks.json', 'utf8');
  const blocks = JSON.parse(raw);
  console.log(`Loaded ${blocks.length} PL/pgSQL blocks.`);

  for (let i = 0; i < blocks.length; i++) {
    console.log(`Executing Block ${i + 1}/${blocks.length}...`);
    // Output block to a temporary file so MCP can run it if needed, or call apply_migration
    fs.writeFileSync(`.tmp/block_run_${i}.sql`, blocks[i]);
  }

  console.log('All block files written to .tmp/block_run_*.sql');
}

applyBlocks();
