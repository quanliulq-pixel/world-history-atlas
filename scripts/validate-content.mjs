import { ERAS } from '../src/data/eras.ts';
import { ALL_EVENTS, EVENT_MAP } from '../src/data/events/index.ts';
import { ALL_FIGURES } from '../src/data/figures/index.ts';
import { HISTORICAL_ROUTES } from '../src/data/routes.ts';
import { STORYLINES } from '../src/data/storylines.ts';
import { WORLD_PULSE_SLICES } from '../src/data/worldPulse.ts';

const errors = [];

const eraIds = new Set(ERAS.map((e) => e.id));
const weightSum = ERAS.reduce((s, e) => s + e.weight, 0);
if (Math.abs(weightSum - 1) > 1e-6) {
  errors.push(`ERAS weights sum to ${weightSum}, expected 1.0`);
}

if (ALL_EVENTS.length < 125) {
  errors.push(`Expected >= 125 events, found ${ALL_EVENTS.length}`);
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

if (errors.length > 0) {
  console.error('Content validation FAILED:');
  for (const err of errors) console.error('  -', err);
  process.exit(1);
}

console.log('Content validation PASSED:');
console.log(`  - Eras: ${ERAS.length}`);
console.log(`  - Events: ${ALL_EVENTS.length}`);
console.log(`  - Figures: ${ALL_FIGURES.length}`);
console.log(`  - Routes: ${HISTORICAL_ROUTES.length}`);
console.log(`  - Storylines: ${STORYLINES.length}`);
console.log(`  - World pulse slices: ${WORLD_PULSE_SLICES.length}`);
