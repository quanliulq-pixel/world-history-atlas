import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_EVENTS } from '../src/data/events';
import { ALL_FIGURES } from '../src/data/figures';
import { getEraForYear, getSubPeriodForYear } from '../src/utils/timeline';
import {
  buildDeepEventStoryPlan,
  buildDeepFigureStoryPlan,
} from '../src/utils/chronicleStory';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT_DIR, 'colab', 'narration-scripts.json');

const STARTER_EVENT_IDS = new Set([
  'e1-uruk',
  'e1-narmer',
  'e1-indus',
  'e1-hammurabi',
  'e2-athens-democracy',
  'e2-qin-unification',
  'e2-zhang-qian',
  'e2-roman-empire',
  'e3-milan-constantinople',
  'e3-tang-chang-an',
  'e4-mongol-empire',
  'e5-columbus',
  'e6-industrial-revolution',
  'e7-ww2-end-un',
  'e8-internet',
]);

const STARTER_FIGURE_IDS = new Set([
  'fig-hammurabi',
  'fig-confucius',
  'fig-buddha',
  'fig-socrates',
  'fig-alexander',
  'fig-qin-shihuang',
  'fig-caesar',
  'fig-leonardo',
  'fig-galileo',
  'fig-newton',
  'fig-watt',
  'fig-darwin',
  'fig-einstein',
  'fig-zheng-he',
  'fig-columbus',
]);

function normalizeSpoken(text) {
  if (!text) return '';
  return String(text)
    .replace(/[*_`#>~]/g, '')
    .replace(/[“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEventItem(ev, idx) {
  const era = getEraForYear(ev.year);
  const subPeriod = getSubPeriodForYear(ev.year);
  const plan = buildDeepEventStoryPlan(ev, era, subPeriod);
  const beats = plan.beats.map((b, beatIdx) => ({
    index: beatIdx,
    title: b.title,
    narration: normalizeSpoken(b.narration),
    file: `event/${ev.id}/beat-${beatIdx}.mp3`,
  }));

  let tier = 'all';
  if (STARTER_EVENT_IDS.has(ev.id) || (ev.importance === 3 && idx < 15)) {
    tier = 'starter';
  } else if (ev.importance === 3) {
    tier = 'core';
  }

  return {
    key: `ev:${ev.id}`,
    kind: 'event',
    id: ev.id,
    title: ev.title,
    tier,
    script: beats.map((b) => b.narration).join(' '),
    beats,
  };
}

function buildFigureItem(fig, idx) {
  const era = getEraForYear(fig.activeYear);
  const plan = buildDeepFigureStoryPlan(fig, era);
  const beats = plan.beats.map((b, beatIdx) => ({
    index: beatIdx,
    title: b.title,
    narration: normalizeSpoken(b.narration),
    file: `figure/${fig.id}/beat-${beatIdx}.mp3`,
  }));

  let tier = 'all';
  if (STARTER_FIGURE_IDS.has(fig.id) || (fig.importance === 3 && idx < 15)) {
    tier = 'starter';
  } else if (fig.importance === 3) {
    tier = 'core';
  }

  return {
    key: `fig:${fig.id}`,
    kind: 'figure',
    id: fig.id,
    title: fig.name,
    tier,
    script: beats.map((b) => b.narration).join(' '),
    beats,
  };
}

const items = [
  ...ALL_EVENTS.map((ev, i) => buildEventItem(ev, i)),
  ...ALL_FIGURES.map((fig, i) => buildFigureItem(fig, i)),
];

const counts = {
  total: items.length,
  totalClips: items.reduce((sum, x) => sum + x.beats.length, 0),
  starter: items.filter((i) => i.tier === 'starter').length,
  core: items.filter((i) => i.tier === 'starter' || i.tier === 'core').length,
  all: items.length,
  byKind: {
    event: items.filter((i) => i.kind === 'event').length,
    figure: items.filter((i) => i.kind === 'figure').length,
  },
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

const emptyBeats = items.filter((i) => i.beats.some((b) => !b.narration.trim())).length;
console.log(
  `Exported ${counts.total} narration scripts (${counts.totalClips} beat clips) -> ${path.relative(ROOT_DIR, OUT_FILE)}`,
);
console.log('Breakdown:', counts, '| Empty beat scripts:', emptyBeats);
