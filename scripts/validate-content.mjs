import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERAS } from '../src/data/eras.ts';
import { ALL_EVENTS, EVENT_MAP } from '../src/data/events/index.ts';
import { ALL_FIGURES, FIGURE_MAP } from '../src/data/figures/index.ts';
import { COUNTRY_PROFILES } from '../src/data/countries/index.ts';
import { GEO_FEATURES } from '../src/data/geoFeatures.ts';
import { HISTORICAL_MEGA_STRUCTURES, HISTORICAL_PLACES } from '../src/data/historicalPlaces.ts';
import { HISTORICAL_ROUTES } from '../src/data/routes.ts';
import { STORYLINES } from '../src/data/storylines.ts';
import { WORLD_PULSE_SLICES } from '../src/data/worldPulse.ts';

const errors = [];

const eraIds = new Set(ERAS.map((e) => e.id));
const weightSum = ERAS.reduce((s, e) => s + e.weight, 0);
if (Math.abs(weightSum - 1) > 1e-6) {
  errors.push(`ERAS weights sum to ${weightSum}, expected 1.0`);
}

if (ALL_EVENTS.length < 165) {
  errors.push(`Expected >= 165 events, found ${ALL_EVENTS.length}`);
}

for (const era of ERAS) {
  if (!Array.isArray(era.subPeriods) || era.subPeriods.length < 3) {
    errors.push(`Era ${era.id} must have >= 3 subPeriods`);
    continue;
  }
  if (era.subPeriods[0].startYear !== era.startYear) {
    errors.push(`Era ${era.id} first subPeriod startYear mismatch`);
  }
  for (let i = 0; i < era.subPeriods.length - 1; i++) {
    if (era.subPeriods[i].endYear !== era.subPeriods[i + 1].startYear) {
      errors.push(`Era ${era.id} subPeriod gap between ${era.subPeriods[i].id} and ${era.subPeriods[i + 1].id}`);
    }
  }
  if (era.subPeriods[era.subPeriods.length - 1].endYear !== era.endYear) {
    errors.push(`Era ${era.id} last subPeriod endYear mismatch`);
  }
}

const routeMap = new Map(HISTORICAL_ROUTES.map((r) => [r.id, r]));
if (HISTORICAL_ROUTES.length < 18) {
  errors.push(`Expected >= 18 routes, found ${HISTORICAL_ROUTES.length}`);
}

const seenEventIds = new Set();
for (const ev of ALL_EVENTS) {
  if (seenEventIds.has(ev.id)) {
    errors.push(`Duplicate event id: ${ev.id}`);
  }
  seenEventIds.add(ev.id);

  if (!eraIds.has(ev.eraId)) {
    errors.push(`Event ${ev.id} references unknown eraId: ${ev.eraId}`);
  }

  const [lng, lat] = ev.coords;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    errors.push(`Event ${ev.id} has invalid coords: ${JSON.stringify(ev.coords)}`);
  }

  for (const field of ['summary', 'geography', 'politics', 'economy', 'culture', 'consequence']) {
    if (!ev.card[field] || ev.card[field].trim().length < 8) {
      errors.push(`Event ${ev.id} missing or too short card.${field}`);
    }
  }

  if (!ev.wikiUrl || !ev.wikiUrl.startsWith('https://')) {
    errors.push(`Event ${ev.id} invalid wikiUrl: ${ev.wikiUrl}`);
  }

  for (const causeId of ev.causes || []) {
    if (!EVENT_MAP[causeId]) {
      errors.push(`Event ${ev.id} cause not found: ${causeId}`);
    }
  }
  for (const effectId of ev.effects || []) {
    if (!EVENT_MAP[effectId]) {
      errors.push(`Event ${ev.id} effect not found: ${effectId}`);
    }
  }
  for (const rId of ev.routeIds || []) {
    if (!routeMap.has(rId)) {
      errors.push(`Event ${ev.id} routeId not found: ${rId}`);
    }
  }
}

for (const r of HISTORICAL_ROUTES) {
  if (!r.waypoints || r.waypoints.length < 2) {
    errors.push(`Route ${r.id} must have >= 2 waypoints`);
  }
  for (const [lng, lat] of r.waypoints) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push(`Route ${r.id} invalid waypoint [${lng}, ${lat}]`);
    }
  }
}

if (STORYLINES.length !== 5) {
  errors.push(`Expected 5 storylines, found ${STORYLINES.length}`);
}

for (const sl of STORYLINES) {
  if (!sl.steps || sl.steps.length < 4) {
    errors.push(`Storyline ${sl.id} has too few steps`);
  }
  for (const step of sl.steps) {
    if (!EVENT_MAP[step.eventId]) {
      errors.push(`Storyline ${sl.id} references unknown eventId: ${step.eventId}`);
    }
    for (const rId of step.highlightRouteIds || []) {
      if (!routeMap.has(rId)) {
        errors.push(`Storyline ${sl.id} references unknown routeId: ${rId}`);
      }
    }
  }
}

if (WORLD_PULSE_SLICES.length < 16) {
  errors.push(`Expected >= 16 world pulse slices, found ${WORLD_PULSE_SLICES.length}`);
}

for (const slice of WORLD_PULSE_SLICES) {
  if (slice.regions.length !== 6) {
    errors.push(`World pulse ${slice.id} expected 6 regions, found ${slice.regions.length}`);
  }
  for (const reg of slice.regions) {
    if (reg.spotlightEventId && !EVENT_MAP[reg.spotlightEventId]) {
      errors.push(`World pulse ${slice.id} (${reg.region}) unknown spotlightEventId: ${reg.spotlightEventId}`);
    }
  }
}

if (ALL_FIGURES.length < 80) {
  errors.push(`Expected >= 80 historical figures, found ${ALL_FIGURES.length}`);
}

const seenFigureIds = new Set();
for (const fig of ALL_FIGURES) {
  if (seenFigureIds.has(fig.id)) {
    errors.push(`Duplicate figure id: ${fig.id}`);
  }
  seenFigureIds.add(fig.id);

  if (!eraIds.has(fig.eraId)) {
    errors.push(`Figure ${fig.id} references unknown eraId: ${fig.eraId}`);
  }

  const [lng, lat] = fig.coords;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    errors.push(`Figure ${fig.id} has invalid coords: ${JSON.stringify(fig.coords)}`);
  }

  if (fig.birthYear > fig.activeYear) {
    errors.push(`Figure ${fig.id} has birthYear (${fig.birthYear}) > activeYear (${fig.activeYear})`);
  }

  for (const field of ['oneLiner', 'eraContext', 'coreContributions', 'historicalImpact']) {
    if (!fig.card[field] || fig.card[field].trim().length < 8) {
      errors.push(`Figure ${fig.id} missing or too short card.${field}`);
    }
  }

  if (!fig.wikiUrl || !fig.wikiUrl.startsWith('https://')) {
    errors.push(`Figure ${fig.id} invalid wikiUrl: ${fig.wikiUrl}`);
  }

  for (const evId of fig.relatedEventIds || []) {
    if (!EVENT_MAP[evId]) {
      errors.push(`Figure ${fig.id} relatedEventId not found: ${evId}`);
    }
  }
}

if (COUNTRY_PROFILES.length < 28) {
  errors.push(`Expected >= 28 curated country profiles, found ${COUNTRY_PROFILES.length}`);
}

const __validateDir = path.dirname(fileURLToPath(import.meta.url));
const countryIdxPath = path.resolve(__validateDir, '..', 'public', 'data', 'country-evolution-index.json');
let countryIndexJson = null;
if (!fs.existsSync(countryIdxPath)) {
  errors.push(`Missing generated country index at ${countryIdxPath}`);
} else {
  countryIndexJson = JSON.parse(fs.readFileSync(countryIdxPath, 'utf8'));
  const mcCount = Object.keys(countryIndexJson.modernCountries || {}).length;
  if (mcCount < 180) {
    errors.push(`Expected >= 180 modernCountries in country-evolution-index.json, found ${mcCount}`);
  }
}

const seenCountryIds = new Set();
for (const c of COUNTRY_PROFILES) {
  if (seenCountryIds.has(c.id)) {
    errors.push(`Duplicate country profile id: ${c.id}`);
  }
  seenCountryIds.add(c.id);

  const [lng, lat] = c.coords;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    errors.push(`Country ${c.id} has invalid coords: ${JSON.stringify(c.coords)}`);
  }
  if (!Number.isFinite(c.zoom) || c.zoom < 1 || c.zoom > 8) {
    errors.push(`Country ${c.id} has invalid zoom: ${c.zoom}`);
  }
  if (!Array.isArray(c.stages) || c.stages.length < 2) {
    errors.push(`Country ${c.id} must have >= 2 evolution stages`);
  }
  for (const field of ['geography', 'politics', 'economy', 'culture']) {
    if (!c.overview[field] || c.overview[field].trim().length < 8) {
      errors.push(`Country ${c.id} missing or too short overview.${field}`);
    }
  }
  for (const evId of c.eventIds || []) {
    if (!EVENT_MAP[evId]) {
      errors.push(`Country ${c.id} unknown eventId: ${evId}`);
    }
  }
  for (const figId of c.figureIds || []) {
    if (!FIGURE_MAP[figId]) {
      errors.push(`Country ${c.id} unknown figureId: ${figId}`);
    }
  }
  if (countryIndexJson && !countryIndexJson.modernCountries?.[c.modernCountryKey]) {
    errors.push(`Country ${c.id} modernCountryKey "${c.modernCountryKey}" missing in country-evolution-index.json`);
  }
}

if (errors.length > 0) {
  console.error('Content validation FAILED:');
  for (const err of errors) console.error('  -', err);
  process.exit(1);
}

const unsupportedSymbolRe = /[\u2500-\u27FF]/;
if (GEO_FEATURES.length < 60) {
  errors.push(`Expected >= 60 GEO_FEATURES, found ${GEO_FEATURES.length}`);
}
for (const gf of GEO_FEATURES) {
  if (unsupportedSymbolRe.test(gf.name)) {
    errors.push(`Geo feature ${gf.id} contains unsupported glyph: ${gf.name}`);
  }
}
if (HISTORICAL_PLACES.length < 95) {
  errors.push(`Expected >= 95 HISTORICAL_PLACES, found ${HISTORICAL_PLACES.length}`);
}
for (const pl of HISTORICAL_PLACES) {
  if (unsupportedSymbolRe.test(pl.name)) {
    errors.push(`Historical place ${pl.id} contains unsupported glyph: ${pl.name}`);
  }
}
if (HISTORICAL_MEGA_STRUCTURES.length < 4) {
  errors.push(`Expected >= 4 HISTORICAL_MEGA_STRUCTURES, found ${HISTORICAL_MEGA_STRUCTURES.length}`);
}

const manifestPath = path.resolve(__validateDir, '..', 'public', 'data', 'snapshots', 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  errors.push(`Missing snapshot manifest at ${manifestPath}`);
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if ((manifest.snapshots || []).length < 50) {
    errors.push(`Expected >= 50 snapshots in manifest.json, found ${(manifest.snapshots || []).length}`);
  }
  if (!manifest.snapshots?.some((s) => s.year === 220)) {
    errors.push('Missing AD 220 Three Kingdoms snapshot in manifest.json');
  }
}

if (errors.length > 0) {
  console.error('Content validation FAILED:');
  for (const err of errors) console.error('  -', err);
  process.exit(1);
}

console.log('Content validation PASSED:');
console.log(`  - Eras: ${ERAS.length}`);
console.log(`  - Events: ${ALL_EVENTS.length}`);
console.log(`  - Figures: ${ALL_FIGURES.length}`);
console.log(`  - Countries: ${COUNTRY_PROFILES.length}`);
console.log(`  - Geo labels: ${GEO_FEATURES.length}`);
console.log(`  - Historical places: ${HISTORICAL_PLACES.length}`);
console.log(`  - Routes: ${HISTORICAL_ROUTES.length}`);
console.log(`  - Storylines: ${STORYLINES.length}`);
console.log(`  - World pulse slices: ${WORLD_PULSE_SLICES.length}`);
