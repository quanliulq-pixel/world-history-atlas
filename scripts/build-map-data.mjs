import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';
import { EXTRA_SNAPSHOT_CLONES, HISTORICAL_PATCHES } from './historical-patches.mjs';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_RAW = path.join(ROOT, '.cache', 'raw');
const PUBLIC_DIR = path.join(ROOT, 'public');
const FONTS_DIR = path.join(PUBLIC_DIR, 'fonts', 'atlas');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

const SNAPSHOT_YEARS = [
  -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
  100, 200, 220, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300,
  1400, 1492, 1500, 1530, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1878, 1880,
  1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010,
];

const FONT_RANGES = [
  '0-255.pbf',
  '256-511.pbf',
  '8192-8447.pbf',
  '12288-12543.pbf',
  '65280-65535.pbf',
];

function snapshotSourceFilename(year) {
  return year < 0 ? `world_bc${Math.abs(year)}.geojson` : `world_${year}.geojson`;
}

function snapshotOutFilename(year) {
  return `y_${year}.topo.json`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadToFile(url, destPath, binary = false) {
  try {
    const stat = await fs.stat(destPath);
    if (stat.size > 0) return false;
  } catch {
    // file does not exist
  }
  await ensureDir(path.dirname(destPath));
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
  if (proxy) {
    const tmpPath = `${destPath}.tmp`;
    let lastErr = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const args = [
          '-fsSL',
          '--http1.1',
          '--connect-timeout',
          '20',
          '--max-time',
          '60',
          '--proxy',
          proxy,
          '-o',
          tmpPath,
          url,
        ];
        await execFileAsync('curl.exe', args, { maxBuffer: 64 * 1024 * 1024 });
        const stat = await fs.stat(tmpPath);
        if (stat.size === 0) throw new Error(`Empty response downloading ${url}`);
        await fs.rename(tmpPath, destPath);
        return true;
      } catch (err) {
        lastErr = err;
        await fs.rm(tmpPath, { force: true }).catch(() => {});
        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }
    throw lastErr;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} downloading ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    throw new Error(`Empty response downloading ${url}`);
  }
  await fs.writeFile(destPath, binary ? buf : buf.toString('utf8'), binary ? undefined : 'utf8');
  return true;
}

function runMapshaper(cmd, inputObj) {
  return new Promise((resolve, reject) => {
    mapshaper.applyCommands(cmd, inputObj, (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}

function cleanStr(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length === 0 ? null : s;
}

function ringSignedArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function ringCentroid(ring) {
  let cx = 0;
  let cy = 0;
  let area6 = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const cross = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
    area6 += cross;
  }
  if (Math.abs(area6) < 1e-8) {
    let sx = 0;
    let sy = 0;
    for (const [x, y] of ring) {
      sx += x;
      sy += y;
    }
    return [sx / Math.max(1, ring.length), sy / Math.max(1, ring.length)];
  }
  return [cx / (3 * area6), cy / (3 * area6)];
}

function pointInRing(pt, ring) {
  const [px, py] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function findInteriorPoint(ring) {
  const centroid = ringCentroid(ring);
  if (pointInRing(centroid, ring)) return centroid;

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const midY = (minY + maxY) / 2;
  const xs = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    if ((y1 <= midY && y2 > midY) || (y2 <= midY && y1 > midY)) {
      const ix = x1 + ((midY - y1) * (x2 - x1)) / (y2 - y1);
      xs.push(ix);
    }
  }
  xs.sort((a, b) => a - b);
  let bestX = (minX + maxX) / 2;
  let bestLen = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const len = xs[i + 1] - xs[i];
    if (len > bestLen) {
      bestLen = len;
      bestX = (xs[i] + xs[i + 1]) / 2;
    }
  }
  if (bestLen > 0) return [bestX, midY];
  return ring[0] ?? [0, 0];
}

function extractLabelsForFeatures(features) {
  const byPolity = new Map();

  for (const feat of features) {
    const key = feat.properties?.p || feat.properties?.n;
    const rawName = feat.properties?.n || key;
    if (!key || !feat.geometry) continue;

    const polys =
      feat.geometry.type === 'Polygon'
        ? [feat.geometry.coordinates]
        : feat.geometry.type === 'MultiPolygon'
          ? feat.geometry.coordinates
          : [];

    for (const poly of polys) {
      const outer = poly[0];
      if (!outer || outer.length < 3) continue;
      const rawArea = Math.abs(ringSignedArea(outer));
      const pt = findInteriorPoint(outer);
      const latWeight = Math.max(0.2, Math.cos((pt[1] * Math.PI) / 180));
      const weightedArea = rawArea * latWeight;

      const existing = byPolity.get(key);
      if (!existing) {
        byPolity.set(key, {
          n: rawName,
          p: key,
          lng: pt[0],
          lat: pt[1],
          bestRingArea: weightedArea,
          totalArea: weightedArea,
        });
      } else {
        existing.totalArea += weightedArea;
        if (weightedArea > existing.bestRingArea) {
          existing.bestRingArea = weightedArea;
          existing.lng = pt[0];
          existing.lat = pt[1];
          if (rawName) existing.n = rawName;
        }
      }
    }
  }

  return Array.from(byPolity.values())
    .sort((a, b) => b.totalArea - a.totalArea)
    .slice(0, 1200)
    .map((item) => ({
      n: item.n,
      p: item.p,
      lng: Math.round(item.lng * 100) / 100,
      lat: Math.round(item.lat * 100) / 100,
      a: Math.round(item.totalArea * 10) / 10,
    }));
}

function featureIntersectsBbox(geom, bbox) {
  if (!geom || !bbox) return true;
  const [minX, minY, maxX, maxY] = bbox;
  let hit = false;
  const walk = (c) => {
    if (hit) return;
    if (typeof c[0] === 'number') {
      if (c[0] >= minX && c[0] <= maxX && c[1] >= minY && c[1] <= maxY) hit = true;
    } else {
      for (let i = 0; i < c.length; i++) walk(c[i]);
    }
  };
  walk(geom.coordinates);
  return hit;
}

function chaikinRing(ring) {
  if (!ring || ring.length < 5) return ring;
  let maxEdge = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const dx = ring[i + 1][0] - ring[i][0];
    const dy = ring[i + 1][1] - ring[i][1];
    const d = Math.hypot(dx, dy);
    if (d > maxEdge) maxEdge = d;
  }
  if (maxEdge < 1.1) return ring;

  const out = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const p0 = ring[i];
    const p1 = ring[i + 1];
    if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 15) {
      out.push(p0);
      continue;
    }
    out.push([
      Number((0.75 * p0[0] + 0.25 * p1[0]).toFixed(4)),
      Number((0.75 * p0[1] + 0.25 * p1[1]).toFixed(4)),
    ]);
    out.push([
      Number((0.25 * p0[0] + 0.75 * p1[0]).toFixed(4)),
      Number((0.25 * p0[1] + 0.75 * p1[1]).toFixed(4)),
    ]);
  }
  if (out.length < 3) return ring;
  out.push(out[0]);
  return out;
}

function smoothCoarseFeature(feat) {
  const geom = feat.geometry;
  if (!geom || (feat.properties?.bp ?? 1) > 1) return feat;
  if (geom.type === 'Polygon') {
    const outer = geom.coordinates[0];
    if (!outer || outer.length >= 100) return feat;
    return {
      ...feat,
      geometry: {
        type: 'Polygon',
        coordinates: geom.coordinates.map((ring) => chaikinRing(ring)),
      },
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...feat,
      geometry: {
        type: 'MultiPolygon',
        coordinates: geom.coordinates.map((poly) =>
          poly[0] && poly[0].length < 100 ? poly.map((ring) => chaikinRing(ring)) : poly,
        ),
      },
    };
  }
  return feat;
}

async function buildFonts() {
  await ensureDir(FONTS_DIR);
  console.log('1/3 Downloading self-hosted Noto Sans Regular PBF glyph ranges...');
  for (const rangeFile of FONT_RANGES) {
    const url = `https://demotiles.maplibre.org/font/Noto%20Sans%20Regular/${rangeFile}`;
    const dest = path.join(FONTS_DIR, rangeFile);
    const downloaded = await downloadToFile(url, dest, true);
    const stat = await fs.stat(dest);
    console.log(`   - ${rangeFile}: ${(stat.size / 1024).toFixed(1)} KB ${downloaded ? '(downloaded)' : '(cached)'}`);
  }
}

async function simplifyToTopo(geojsonObj, simplifyCmd) {
  const inputStr = JSON.stringify(geojsonObj);
  const out = await runMapshaper(
    `-i input.geojson ${simplifyCmd} -o out.topo.json format=topojson quantization=1e5`,
    { 'input.geojson': inputStr },
  );
  return JSON.parse(out['out.topo.json'].toString('utf8'));
}

async function clipGeoJsonFeatures(features, maskGeoJsonStr) {
  if (!features || features.length === 0) return [];
  const fcStr = JSON.stringify({ type: 'FeatureCollection', features });
  const out = await runMapshaper(
    '-i target.geojson -clip mask.geojson -o out.geojson format=geojson',
    { 'target.geojson': fcStr, 'mask.geojson': maskGeoJsonStr },
  );
  const parsed = JSON.parse(out['out.geojson'].toString('utf8'));
  return parsed.features || [];
}

async function eraseGeoJsonFeatures(features, eraseFeatures) {
  if (!features || features.length === 0 || !eraseFeatures || eraseFeatures.length === 0) {
    return features;
  }
  const targetStr = JSON.stringify({ type: 'FeatureCollection', features });
  const eraseStr = JSON.stringify({ type: 'FeatureCollection', features: eraseFeatures });
  const out = await runMapshaper(
    '-i target.geojson -erase erase.geojson -o out.geojson format=geojson',
    { 'target.geojson': targetStr, 'erase.geojson': eraseStr },
  );
  const parsed = JSON.parse(out['out.geojson'].toString('utf8'));
  return parsed.features || [];
}

async function buildPhysicalAtlas() {
  console.log('2/3 Building high-precision physical geography TopoJSON...');
  const neBase = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
  const files = [
    'ne_50m_land.geojson',
    'ne_50m_lakes.geojson',
    'ne_50m_rivers_lake_centerlines.geojson',
    'ne_50m_geography_regions_polys.geojson',
  ];

  for (const f of files) {
    const dest = path.join(CACHE_RAW, f);
    const downloaded = await downloadToFile(`${neBase}/${f}`, dest, false);
    console.log(`   - ${f} ${downloaded ? '(downloaded)' : '(cached)'}`);
  }

  const landRawStr = await fs.readFile(path.join(CACHE_RAW, 'ne_50m_land.geojson'), 'utf8');
  const landRaw = JSON.parse(landRawStr);
  const landFiltered = {
    type: 'FeatureCollection',
    features: landRaw.features.map((f) => ({
      type: 'Feature',
      properties: {},
      geometry: f.geometry,
    })),
  };

  const lakesRaw = JSON.parse(await fs.readFile(path.join(CACHE_RAW, 'ne_50m_lakes.geojson'), 'utf8'));
  const lakesFiltered = {
    type: 'FeatureCollection',
    features: lakesRaw.features
      .filter((f) => Number(f.properties?.scalerank ?? 99) <= 6)
      .map((f) => ({
        type: 'Feature',
        properties: { n: cleanStr(f.properties?.name) },
        geometry: f.geometry,
      })),
  };

  const riversRaw = JSON.parse(
    await fs.readFile(path.join(CACHE_RAW, 'ne_50m_rivers_lake_centerlines.geojson'), 'utf8'),
  );
  const riversFiltered = {
    type: 'FeatureCollection',
    features: riversRaw.features
      .filter((f) => Number(f.properties?.scalerank ?? 99) <= 8)
      .map((f) => ({
        type: 'Feature',
        properties: { n: cleanStr(f.properties?.name) },
        geometry: f.geometry,
      })),
  };

  const reliefRaw = JSON.parse(
    await fs.readFile(path.join(CACHE_RAW, 'ne_50m_geography_regions_polys.geojson'), 'utf8'),
  );
  const reliefFiltered = {
    type: 'FeatureCollection',
    features: reliefRaw.features
      .filter((f) => {
        const cls = f.properties?.featurecla;
        const rank = Number(f.properties?.scalerank ?? 99);
        return (
          (cls === 'Range/mtn' && rank <= 6) ||
          (cls === 'Desert' && rank <= 6) ||
          (cls === 'Plateau' && rank <= 5)
        );
      })
      .map((f) => ({
        type: 'Feature',
        properties: {
          k: f.properties?.featurecla,
          n: cleanStr(f.properties?.name),
        },
        geometry: f.geometry,
      })),
  };

  const bundle = {
    land: await simplifyToTopo(landFiltered, '-simplify 55% keep-shapes'),
    lakes: await simplifyToTopo(lakesFiltered, '-simplify 55% keep-shapes'),
    rivers: await simplifyToTopo(riversFiltered, '-simplify 55%'),
    relief: await simplifyToTopo(reliefFiltered, '-simplify 45% keep-shapes'),
  };

  await ensureDir(DATA_DIR);
  const outPath = path.join(DATA_DIR, 'physical.topo.json');
  const outJson = JSON.stringify(bundle);
  await fs.writeFile(outPath, outJson, 'utf8');
  console.log(`   => Wrote physical.topo.json (${(Buffer.byteLength(outJson) / 1024).toFixed(1)} KB)`);
  return landRawStr;
}

async function processSnapshot(year, polityFreqMap, landGeoJsonStr) {
  const cloneEntry = EXTRA_SNAPSHOT_CLONES.find((c) => c.year === year);
  const sourceYear = cloneEntry ? cloneEntry.baseYear : year;
  const srcName = snapshotSourceFilename(sourceYear);
  const cachePath = path.join(CACHE_RAW, 'snapshots', srcName);
  const url = `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/${srcName}`;
  await downloadToFile(url, cachePath, false);

  const raw = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  let claimedFeatures = [];

  for (const f of raw.features || []) {
    if (!f.geometry) continue;
    const n = cleanStr(f.properties?.NAME);
    const partof = cleanStr(f.properties?.PARTOF);
    const subjecto = cleanStr(f.properties?.SUBJECTO);
    if (!n && !partof && !subjecto) continue;

    const p = partof || subjecto || n;
    const bp = Number(f.properties?.BORDERPRECISION ?? 1) || 1;
    claimedFeatures.push({
      type: 'Feature',
      properties: { n: n || p, p, bp },
      geometry: f.geometry,
    });
  }

  // Smooth only coarse legacy polygons before applying high-resolution historical patches
  claimedFeatures = claimedFeatures.map(smoothCoarseFeature);

  // Apply fine-grained curated regional patches (e.g., Spring & Autumn, Warring States, Three Kingdoms, Italy)
  const patches = HISTORICAL_PATCHES[year] || [];
  for (const patch of patches) {
    if (patch.removeNames && patch.removeNames.length > 0) {
      const rmSet = new Set(patch.removeNames);
      claimedFeatures = claimedFeatures.filter((feat) => {
        if (!rmSet.has(feat.properties?.n) && !rmSet.has(feat.properties?.p)) return true;
        if (patch.removeInBbox) {
          return !featureIntersectsBbox(feat.geometry, patch.removeInBbox);
        }
        return false;
      });
    }

    let patchFeats = patch.clipLand
      ? await clipGeoJsonFeatures(patch.features, landGeoJsonStr)
      : patch.features;

    if (patch.italyKeepNames && patch.italyKeepNames.length > 0) {
      const keepSet = new Set(patch.italyKeepNames);
      const keepFeats = claimedFeatures.filter((f) => keepSet.has(f.properties?.n));
      if (keepFeats.length > 0) {
        patchFeats = await eraseGeoJsonFeatures(patchFeats, keepFeats);
      }
    }

    const trimNames = [
      ...(patch.italyTrimNames || []),
      ...(patch.eraseOverlapNames || []),
    ];
    if (trimNames.length > 0 && patchFeats.length > 0) {
      const trimSet = new Set(trimNames);
      const toTrim = [];
      const untouched = [];
      for (const f of claimedFeatures) {
        if (trimSet.has(f.properties?.n) || trimSet.has(f.properties?.p)) toTrim.push(f);
        else untouched.push(f);
      }
      const trimmed = await eraseGeoJsonFeatures(toTrim, patchFeats);
      claimedFeatures = [...untouched, ...trimmed];
    }

    claimedFeatures.push(...patchFeats);
  }

  for (const feat of claimedFeatures) {
    const n = feat.properties?.n;
    const p = feat.properties?.p;
    if (n) polityFreqMap.set(n, (polityFreqMap.get(n) || 0) + 1);
    if (p && p !== n) polityFreqMap.set(p, (polityFreqMap.get(p) || 0) + 1);
  }

  const labels = extractLabelsForFeatures(claimedFeatures);
  const cleanedCollection = {
    type: 'FeatureCollection',
    features: claimedFeatures,
  };

  const topo = await simplifyToTopo(cleanedCollection, '-simplify 45% keep-shapes');
  topo.labels = labels;

  const outFile = snapshotOutFilename(year);
  const outPath = path.join(SNAPSHOTS_DIR, outFile);
  const outJson = JSON.stringify(topo);
  await fs.writeFile(outPath, outJson, 'utf8');

  return {
    year,
    file: outFile,
    polityCount: labels.length,
    sizeKb: Math.round((Buffer.byteLength(outJson) / 1024) * 10) / 10,
  };
}

async function buildSnapshots(landGeoJsonStr) {
  console.log(`3/3 Building ${SNAPSHOT_YEARS.length} high-precision historical empire snapshots...`);
  await ensureDir(SNAPSHOTS_DIR);
  const polityFreqMap = new Map();
  const results = [];

  // Process in batches of 2 to keep proxy TLS handshakes and memory steady
  const batchSize = 2;
  for (let i = 0; i < SNAPSHOT_YEARS.length; i += batchSize) {
    const batch = SNAPSHOT_YEARS.slice(i, i + batchSize);
    const batchRes = await Promise.all(
      batch.map((y) => processSnapshot(y, polityFreqMap, landGeoJsonStr)),
    );
    results.push(...batchRes);
    console.log(
      `   - Processed ${Math.min(i + batchSize, SNAPSHOT_YEARS.length)}/${SNAPSHOT_YEARS.length} (${batchRes
        .map((r) => `${r.year}:${r.sizeKb}KB`)
        .join(', ')})`,
    );
  }

  results.sort((a, b) => a.year - b.year);
  const allPolities = Array.from(polityFreqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const manifest = {
    generatedAt: new Date().toISOString(),
    snapshots: results.map(({ year, file, polityCount }) => ({ year, file, polityCount })),
    allPolities,
  };

  await fs.writeFile(path.join(SNAPSHOTS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  const totalKb = results.reduce((sum, r) => sum + r.sizeKb, 0);
  console.log(
    `   => Wrote ${results.length} snapshots (total ${(totalKb / 1024).toFixed(2)} MB) and manifest.json (${allPolities.length} unique polities)`,
  );
}

async function main() {
  await buildFonts();
  const landGeoJsonStr = await buildPhysicalAtlas();
  await buildSnapshots(landGeoJsonStr);
  console.log('Done building map data.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
