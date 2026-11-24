import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const DEST = path.join(ROOT, 'public', 'maplibre-gl-worker.js');

async function main() {
  await fs.mkdir(path.dirname(DEST), { recursive: true });
  await fs.copyFile(SRC, DEST);
  const stat = await fs.stat(DEST);
  console.log(`Copied MapLibre worker to public/maplibre-gl-worker.js (${(stat.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
