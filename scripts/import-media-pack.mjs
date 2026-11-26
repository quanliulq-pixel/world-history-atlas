import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  let source = null;
  let forceType = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--type' && argv[i + 1]) {
      forceType = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--type=')) {
      forceType = arg.slice('--type='.length);
    } else if (!arg.startsWith('-')) {
      source = arg;
    }
  }
  return { source, forceType };
}

function expandArchive(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === 'win32') {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'inherit' },
    );
  } else {
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', destDir], { stdio: 'inherit' });
  }
}

function findManifestDir(rootDir) {
  const direct = path.join(rootDir, 'manifest.json');
  if (fs.existsSync(direct)) return rootDir;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(rootDir, e.name, 'manifest.json');
      if (fs.existsSync(sub)) return path.join(rootDir, e.name);
    }
  }
  return null;
}

function detectPackType(manifestJson, forcedType) {
  if (forcedType === 'illustrations' || forcedType === 'audio') return forcedType;
  const items = Object.values(manifestJson?.items || {});
  if (
    items.some(
      (x) =>
        x?.kind === 'ticker' ||
        x?.kind === 'country' ||
        x?.kind === 'story' ||
        Array.isArray(x?.beats) ||
        /\.(mp3|opus|ogg|wav)$/i.test(x?.file || ''),
    )
  ) {
    return 'audio';
  }
  if (items.some((x) => /\.(webp|png|jpg|jpeg)$/i.test(x?.file || ''))) {
    return 'illustrations';
  }
  if (manifestJson?.engine) return 'audio';
  if (manifestJson?.model) return 'illustrations';
  throw new Error('Could not auto-detect pack type. Pass --type illustrations or --type audio.');
}

function collectFiles(manifestJson, packType) {
  const relFiles = new Set();
  for (const entry of Object.values(manifestJson?.items || {})) {
    if (!entry || typeof entry !== 'object') continue;
    if (packType === 'illustrations' && entry.file) {
      relFiles.add(String(entry.file).replace(/^\/+/, ''));
    } else if (packType === 'audio') {
      if (entry.file) relFiles.add(String(entry.file).replace(/^\/+/, ''));
      if (Array.isArray(entry.beats)) {
        for (const b of entry.beats) {
          if (b?.file) relFiles.add(String(b.file).replace(/^\/+/, ''));
        }
      }
    }
  }
  return [...relFiles];
}

function main() {
  const { source, forceType } = parseArgs(process.argv.slice(2));
  if (!source) {
    console.error('Usage: npm run media:import -- <path-to-zip-or-dir> [--type illustrations|audio]');
    process.exit(1);
  }

  const resolvedSource = path.resolve(source);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Source path not found: ${resolvedSource}`);
    process.exit(1);
  }

  let tempDir = null;
  try {
    let packDir = resolvedSource;
    if (fs.statSync(resolvedSource).isFile()) {
      if (!resolvedSource.toLowerCase().endsWith('.zip')) {
        throw new Error('Expected a .zip archive or extracted directory containing manifest.json');
      }
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wha-media-pack-'));
      expandArchive(resolvedSource, tempDir);
      const found = findManifestDir(tempDir);
      if (!found) {
        throw new Error('manifest.json was not found inside the zip archive.');
      }
      packDir = found;
    } else {
      const found = findManifestDir(resolvedSource);
      if (!found) {
        throw new Error(`manifest.json was not found in ${resolvedSource}`);
      }
      packDir = found;
    }

    const incomingManifest = JSON.parse(
      fs.readFileSync(path.join(packDir, 'manifest.json'), 'utf8'),
    );
    const packType = detectPackType(incomingManifest, forceType);
    const targetDir = path.join(ROOT_DIR, 'public', 'media', packType);
    const targetManifestPath = path.join(targetDir, 'manifest.json');
    fs.mkdirSync(targetDir, { recursive: true });

    let existingManifest = { version: 1, items: {} };
    if (fs.existsSync(targetManifestPath)) {
      try {
        existingManifest = JSON.parse(fs.readFileSync(targetManifestPath, 'utf8'));
      } catch {
        existingManifest = { version: 1, items: {} };
      }
    }

    const relFiles = collectFiles(incomingManifest, packType);
    let copied = 0;
    let totalBytes = 0;

    for (const rel of relFiles) {
      const srcFile = path.join(packDir, rel);
      const dstFile = path.join(targetDir, rel);
      if (!fs.existsSync(srcFile)) continue;
      fs.mkdirSync(path.dirname(dstFile), { recursive: true });
      fs.copyFileSync(srcFile, dstFile);
      copied += 1;
      totalBytes += fs.statSync(dstFile).size;
    }

    const mergedManifest = {
      version: Number(incomingManifest.version || existingManifest.version || 1),
      generatedAt: incomingManifest.generatedAt || new Date().toISOString(),
      ...(incomingManifest.model ? { model: incomingManifest.model } : existingManifest.model ? { model: existingManifest.model } : {}),
      ...(incomingManifest.engine ? { engine: incomingManifest.engine } : existingManifest.engine ? { engine: existingManifest.engine } : {}),
      items: {
        ...(existingManifest.items || {}),
        ...(incomingManifest.items || {}),
      },
    };

    fs.writeFileSync(targetManifestPath, JSON.stringify(mergedManifest, null, 2), 'utf8');

    const totalItems = Object.keys(mergedManifest.items).length;
    console.log(`Imported ${packType} pack into public/media/${packType}/`);
    console.log(
      `Files copied: ${copied} (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) | Total manifest items: ${totalItems}`,
    );
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

main();
