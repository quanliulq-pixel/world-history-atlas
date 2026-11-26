import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const MEDIA_ROOT = path.join(ROOT_DIR, 'public', 'media');
const STATE_FILE = path.join(ROOT_DIR, '.r2-sync-cache.json');
const WRANGLER_CMD =
  process.env.WRANGLER_BIN ||
  'C:\\Users\\lq\\AppData\\Local\\npm-cache\\_npx\\32026684e21afda6\\node_modules\\.bin\\wrangler.cmd';

function parseArgs(argv) {
  let bucket = process.env.R2_MEDIA_BUCKET || 'world-history-atlas-media';
  let dryRun = false;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bucket' && argv[i + 1]) {
      bucket = argv[++i];
    } else if (a.startsWith('--bucket=')) {
      bucket = a.slice('--bucket='.length);
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--force') {
      force = true;
    }
  }
  return { bucket, dryRun, force };
}

function walkFiles(dir, prefix = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      out.push(...walkFiles(abs, rel));
    } else {
      out.push({ abs, key: `media/${rel}` });
    }
  }
  return out;
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.mp3')) return 'audio/mpeg';
  if (filePath.endsWith('.opus') || filePath.endsWith('.ogg')) return 'audio/ogg';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function cacheControlFor(key) {
  if (key.endsWith('/manifest.json')) return 'public, max-age=60, must-revalidate';
  return 'public, max-age=31536000, immutable';
}

function md5File(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const { bucket, dryRun, force } = parseArgs(process.argv.slice(2));
  const files = walkFiles(MEDIA_ROOT);
  if (files.length === 0) {
    console.log('No files found under public/media/. Nothing to sync.');
    return;
  }

  let cache = {};
  if (fs.existsSync(STATE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {
      cache = {};
    }
  }

  const pending = [];
  for (const f of files) {
    const hash = md5File(f.abs);
    if (!force && cache[`${bucket}:${f.key}`] === hash && !f.key.endsWith('/manifest.json')) {
      continue;
    }
    pending.push({ ...f, hash });
  }

  console.log(
    `Found ${files.length} files in public/media/ | ${pending.length} pending upload to R2 bucket "${bucket}"${dryRun ? ' (DRY RUN)' : ''}`,
  );
  if (dryRun || pending.length === 0) return;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    const args = [
      'r2',
      'object',
      'put',
      `${bucket}/${item.key}`,
      '--file',
      item.abs,
      '--content-type',
      contentTypeFor(item.abs),
      '--cache-control',
      cacheControlFor(item.key),
      '--remote',
    ];
    execFileSync(WRANGLER_CMD, args, { stdio: 'inherit' });
    cache[`${bucket}:${item.key}`] = item.hash;
    if ((i + 1) % 25 === 0 || i + 1 === pending.length) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`Uploaded ${i + 1}/${pending.length}`);
    }
  }
  console.log(
    `Done! Point VITE_MEDIA_BASE_URL to your R2 custom domain / pub-*.r2.dev URL before building.`,
  );
}

main();
