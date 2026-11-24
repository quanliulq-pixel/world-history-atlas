import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { getPolityDisplay, isDiffuseCulture, isIgnoredPolity } from '../src/data/polityNames.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT, 'public', 'data', 'snapshots');
const OUTPUT_PATH = path.join(ROOT, 'public', 'data', 'country-evolution-index.json');

/**
 * Historical heartland probe points for vast/transcontinental countries whose
 * modern geographic centroid falls far outside their ancient civilizational core.
 */
const HISTORICAL_PROBE_ANCHORS = {
  China: [113.6, 34.75],
  Russia: [37.62, 55.75],
  'United States': [-77.5, 38.8],
  Egypt: [31.24, 30.04],
  Canada: [-73.57, 45.5],
  Brazil: [-43.2, -22.9],
  Australia: [151.2, -33.86],
  'Saudi Arabia': [40.5, 22.8],
  Iran: [51.67, 32.65],
  Algeria: [3.06, 36.75],
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function ringBbox(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of ring) {
    const x = pt[0];
    const y = pt[1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Shoelace area weighted by cos(midLat) in approximate degree^2 units
 * so high-latitude rings aren't artificially inflated relative to tropics.
 */
function ringWeightedArea(ring) {
  if (!ring || ring.length < 3) return 0;
  let sum = 0;
  let latSum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a[0] * b[1] - b[0] * a[1];
    latSum += a[1];
  }
  const midLat = latSum / ring.length;
  const cosLat = Math.max(0.25, Math.cos((midLat * Math.PI) / 180));
  return (Math.abs(sum) / 2) * cosLat;
}

function polygonWeightedArea(polyCoords) {
  if (!polyCoords || polyCoords.length === 0) return 0;
  let area = ringWeightedArea(polyCoords[0]);
  for (let i = 1; i < polyCoords.length; i++) {
    area = Math.max(0, area - ringWeightedArea(polyCoords[i]));
  }
  return area;
}

function extractPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function geometryWeightedArea(geometry) {
  let total = 0;
  for (const poly of extractPolygons(geometry)) {
    total += polygonWeightedArea(poly);
  }
  return total;
}

function pointInRing(pt, ring) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > y) !== (yj > y)) {
      const xIntersect = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xIntersect) inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(pt, polyCoords) {
  if (!polyCoords || polyCoords.length === 0) return false;
  if (!pointInRing(pt, polyCoords[0])) return false;
  for (let i = 1; i < polyCoords.length; i++) {
    if (pointInRing(pt, polyCoords[i])) return false;
  }
  return true;
}

function pointInGeometries(pt, geometries) {
  for (const geom of geometries) {
    for (const poly of extractPolygons(geom)) {
      if (pointInPolygon(pt, poly)) return true;
    }
  }
  return false;
}

function ringCentroid(ring) {
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area2) > 1e-6) {
    return [cx / (3 * area2), cy / (3 * area2)];
  }
  const [minX, minY, maxX, maxY] = ringBbox(ring);
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function scanlinePointInPolygon(polyCoords) {
  const outer = polyCoords[0];
  const [minX, minY, maxX, maxY] = ringBbox(outer);
  for (const frac of [0.5, 0.35, 0.65, 0.25, 0.75, 0.15, 0.85]) {
    const y = minY + (maxY - minY) * frac;
    const xs = [];
    for (const ring of polyCoords) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const x1 = ring[i][0];
        const y1 = ring[i][1];
        const x2 = ring[j][0];
        const y2 = ring[j][1];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
    }
    xs.sort((a, b) => a - b);
    let bestPt = null;
    let bestLen = -1;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const len = xs[k + 1] - xs[k];
      if (len > bestLen) {
        const midX = (xs[k] + xs[k + 1]) / 2;
        if (pointInPolygon([midX, y], polyCoords)) {
          bestLen = len;
          bestPt = [midX, y];
        }
      }
    }
    if (bestPt) return bestPt;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function findBestInteriorPoint(geometries) {
  let largestPoly = null;
  let largestArea = -1;
  for (const geom of geometries) {
    for (const poly of extractPolygons(geom)) {
      const area = polygonWeightedArea(poly);
      if (area > largestArea) {
        largestArea = area;
        largestPoly = poly;
      }
    }
  }
  if (!largestPoly) return { center: [0, 0], primaryBbox: [0, 0, 0, 0] };

  const centroid = ringCentroid(largestPoly[0]);
  const pt = pointInPolygon(centroid, largestPoly)
    ? centroid
    : scanlinePointInPolygon(largestPoly);

  // Build bbox around contiguous primary region so distant overseas/antimeridian islands don't distort bounds
  const pBbox = ringBbox(largestPoly[0]);
  const pMidX = (pBbox[0] + pBbox[2]) / 2;
  let minX = pBbox[0];
  let minY = pBbox[1];
  let maxX = pBbox[2];
  let maxY = pBbox[3];

  for (const geom of geometries) {
    for (const poly of extractPolygons(geom)) {
      const b = ringBbox(poly[0]);
      const midX = (b[0] + b[2]) / 2;
      if (Math.abs(midX - pMidX) <= 38) {
        minX = Math.min(minX, b[0]);
        minY = Math.min(minY, b[1]);
        maxX = Math.max(maxX, b[2]);
        maxY = Math.max(maxY, b[3]);
      }
    }
  }

  return {
    center: [round2(pt[0]), round2(pt[1])],
    primaryBbox: [round2(minX), round2(minY), round2(maxX), round2(maxY)],
  };
}

function firstObjectCollection(topo) {
  const key = Object.keys(topo.objects)[0];
  return feature(topo, topo.objects[key]);
}

function loadAndDecodeSnapshot(file) {
  const raw = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, file), 'utf8'));
  const fc = firstObjectCollection(raw);
  return { fc, labels: raw.labels || [] };
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, 'manifest.json'), 'utf8'));
  const snapshots = manifest.snapshots;
  const snapshotYears = snapshots.map((s) => s.year);

  // 1. Build base index of modern countries from the latest snapshot (2010)
  const latestMeta = snapshots[snapshots.length - 1];
  const { fc: latestFc, labels: latestLabels } = loadAndDecodeSnapshot(latestMeta.file);

  const labelCoordsByName = new Map();
  for (const lbl of latestLabels) {
    if (!lbl.n || isIgnoredPolity(lbl.n)) continue;
    const prev = labelCoordsByName.get(lbl.n);
    if (!prev || (lbl.a ?? 0) > (prev.a ?? 0)) {
      labelCoordsByName.set(lbl.n, lbl);
    }
  }

  const modernGroups = new Map();
  for (const feat of latestFc.features) {
    const props = feat.properties || {};
    const enName = (props.n || '').trim();
    if (!enName || isIgnoredPolity(enName)) continue;
    if (!modernGroups.has(enName)) {
      modernGroups.set(enName, []);
    }
    modernGroups.get(enName).push(feat.geometry);
  }

  const modernCountries = {};
  const modernCountryList = [];

  for (const [enName, geometries] of modernGroups.entries()) {
    const { center: safeCenter, primaryBbox } = findBestInteriorPoint(geometries);
    const lbl = labelCoordsByName.get(enName);
    let center = safeCenter;
    if (lbl && pointInGeometries([lbl.lng, lbl.lat], geometries)) {
      center = [round2(lbl.lng), round2(lbl.lat)];
    }

    const zhName = getPolityDisplay(enName, enName).zhName;
    const anchor = HISTORICAL_PROBE_ANCHORS[enName];
    const probePoint =
      anchor && pointInGeometries(anchor, geometries) ? anchor : center;

    const entry = {
      enName,
      zhName,
      center,
      bbox: primaryBbox,
      timeline: [],
    };
    modernCountries[enName] = entry;
    modernCountryList.push({ enName, geometries, bbox: primaryBbox, center, probePoint });
  }

  // 2. Scan all 49 historical snapshots
  const polityAgg = new Map();

  for (const meta of snapshots) {
    const { fc } = loadAndDecodeSnapshot(meta.file);

    const areaByPolity = new Map();
    const stateFeatures = [];
    const diffuseFeatures = [];

    for (const feat of fc.features) {
      const props = feat.properties || {};
      if (isIgnoredPolity(props.n) || isIgnoredPolity(props.p)) continue;

      const enName = (props.n || props.p || '').trim();
      if (!enName) continue;
      const groupEnName = (props.p || enName).trim();
      const diffuse = isDiffuseCulture(enName, groupEnName);
      const area = geometryWeightedArea(feat.geometry);
      const bbox = (() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const poly of extractPolygons(feat.geometry)) {
          const b = ringBbox(poly[0]);
          if (b[0] < minX) minX = b[0];
          if (b[1] < minY) minY = b[1];
          if (b[2] > maxX) maxX = b[2];
          if (b[3] > maxY) maxY = b[3];
        }
        return [minX, minY, maxX, maxY];
      })();

      areaByPolity.set(enName, (areaByPolity.get(enName) || 0) + area);

      if (!diffuse) {
        if (!polityAgg.has(enName)) {
          polityAgg.set(enName, {
            years: new Set(),
            peakYear: meta.year,
            peakArea: -1,
            bestGeometry: feat.geometry,
            largestSnapArea: -1,
            areaByYear: new Map(),
          });
        }
        const agg = polityAgg.get(enName);
        agg.years.add(meta.year);
        agg.areaByYear.set(meta.year, (agg.areaByYear.get(meta.year) || 0) + area);
        if (area > agg.largestSnapArea) {
          agg.largestSnapArea = area;
          agg.bestGeometry = feat.geometry;
        }
      }

      const item = { enName, groupEnName, geometry: feat.geometry, bbox, diffuse };
      if (diffuse) diffuseFeatures.push(item);
      else stateFeatures.push(item);
    }

    // Match each modern country's historical core point against sovereign states first, then diffuse cultures
    for (const mc of modernCountryList) {
      const pt = mc.probePoint;
      let matched = null;

      for (const item of stateFeatures) {
        const b = item.bbox;
        if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
        if (pointInGeometries(pt, [item.geometry])) {
          matched = item;
          break;
        }
      }

      if (!matched) {
        for (const item of diffuseFeatures) {
          const b = item.bbox;
          if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
          if (pointInGeometries(pt, [item.geometry])) {
            matched = item;
            break;
          }
        }
      }

      if (matched) {
        const display = getPolityDisplay(matched.enName, matched.groupEnName);
        modernCountries[mc.enName].timeline.push({
          year: meta.year,
          enName: matched.enName,
          groupEnName: matched.groupEnName,
          zhName: display.zhName,
          area: round1(areaByPolity.get(matched.enName) || 0),
        });
      }
    }
  }

  // 3. Finalize global polity index (center, peak year/area, modernCountry anchor)
  const polities = {};
  for (const [enName, agg] of polityAgg.entries()) {
    const years = [...agg.years].sort((a, b) => a - b);
    let peakYear = years[0];
    let peakArea = 0;
    for (const [yr, a] of agg.areaByYear.entries()) {
      if (a > peakArea) {
        peakArea = a;
        peakYear = yr;
      }
    }
    const { center } = findBestInteriorPoint([agg.bestGeometry]);

    // Map historical polity's peak core point to modern country
    let modernCountry = modernCountries[enName] ? enName : null;
    if (!modernCountry) {
      for (const mc of modernCountryList) {
        const b = mc.bbox;
        if (center[0] < b[0] || center[0] > b[2] || center[1] < b[1] || center[1] > b[3]) continue;
        if (pointInGeometries(center, mc.geometries)) {
          modernCountry = mc.enName;
          break;
        }
      }
    }

    polities[enName] = {
      years,
      peakYear,
      peakArea: round1(peakArea),
      center,
      modernCountry,
    };
  }

  const output = {
    snapshotYears,
    modernCountries,
    polities,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf8');
  const sizeKb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`Built ${OUTPUT_PATH} (${sizeKb} KB):`);
  console.log(`  - Snapshot years: ${snapshotYears.length}`);
  console.log(`  - Modern countries: ${Object.keys(modernCountries).length}`);
  console.log(`  - Historical polities: ${Object.keys(polities).length}`);
}

main();
