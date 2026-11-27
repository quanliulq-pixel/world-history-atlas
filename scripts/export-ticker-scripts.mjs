import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERAS } from '../src/data/eras';
import { ALL_EVENTS } from '../src/data/events';
import {
  buildDeepEventStoryPlan,
  buildEraBridgePlan,
  buildSubPeriodBridgePlan,
} from '../src/utils/chronicleStory';
import { getEraForYear, getSubPeriodForYear } from '../src/utils/timeline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT_DIR, 'colab', 'ticker-audio-scripts.json');

function normalizeSpoken(text) {
  if (!text) return '';
  return String(text)
    .replace(/[*_`#>~]/g, '')
    .replace(/[“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const items = [];

for (const era of ERAS) {
  const eraPlan = buildEraBridgePlan(era);
  items.push({
    key: `ticker:era:${era.id}`,
    kind: 'ticker',
    subtype: 'era',
    id: era.id,
    title: era.name,
    file: `ticker/era/${era.id}.mp3`,
    script: normalizeSpoken(eraPlan.beats.map((b) => b.narration).join(' ')),
    beats: eraPlan.beats.map((b, idx) => ({
      index: idx,
      title: b.title,
      narration: normalizeSpoken(b.narration),
    })),
  });

  for (const sp of era.subPeriods) {
    const spPlan = buildSubPeriodBridgePlan(era, sp);
    items.push({
      key: `ticker:sp:${sp.id}`,
      kind: 'ticker',
      subtype: 'subperiod',
      id: sp.id,
      title: `${era.shortName} · ${sp.name}`,
      file: `ticker/subperiod/${sp.id}.mp3`,
      script: normalizeSpoken(spPlan.beats.map((b) => b.narration).join(' ')),
      beats: spPlan.beats.map((b, idx) => ({
        index: idx,
        title: b.title,
        narration: normalizeSpoken(b.narration),
      })),
    });
  }
}

for (const ev of ALL_EVENTS) {
  const era = getEraForYear(ev.year);
  const sp = getSubPeriodForYear(ev.year);
  const evPlan = buildDeepEventStoryPlan(ev, era, sp);
  items.push({
    key: `ticker:ev:${ev.id}`,
    kind: 'ticker',
    subtype: 'event',
    id: ev.id,
    title: ev.title,
    file: `ticker/event/${ev.id}.mp3`,
    script: normalizeSpoken(evPlan.beats.map((b) => b.narration).join(' ')),
    beats: evPlan.beats.map((b, idx) => ({
      index: idx,
      title: b.title,
      narration: normalizeSpoken(b.narration),
    })),
  });
}

const counts = {
  total: items.length,
  eras: items.filter((i) => i.subtype === 'era').length,
  subPeriods: items.filter((i) => i.subtype === 'subperiod').length,
  events: items.filter((i) => i.subtype === 'event').length,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      counts,
      items,
    },
    null,
    2,
  ),
  'utf8',
);

const emptyCount = items.filter((i) => !i.script.trim()).length;
console.log(
  `Exported ${counts.total} ticker audio scripts -> ${path.relative(ROOT_DIR, OUT_FILE)}`,
);
console.log('Breakdown:', counts, '| Empty scripts:', emptyCount);
