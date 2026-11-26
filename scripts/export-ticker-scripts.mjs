import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERAS } from '../src/data/eras';
import { ALL_EVENTS } from '../src/data/events';
import { formatYear } from '../src/utils/timeline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT_DIR, 'colab', 'ticker-audio-scripts.json');

function normalizeSpoken(text) {
  if (!text) return '';
  return String(text)
    .replace(/[*_`#>~]/g, '')
    .replace(/（[^（）]{0,28}）/g, (m) => (m.length <= 10 ? m : ''))
    .replace(/\([^()]{0,28}\)/g, '')
    .replace(/[“”]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[；;]+/g, '，')
    .trim();
}

function conciseSentence(text, maxChars = 54) {
  const clean = normalizeSpoken(text);
  if (!clean) return '';
  if (clean.length <= maxChars) {
    return /[。！？]$/.test(clean) ? clean : `${clean}。`;
  }
  const firstSent = clean.split(/(?<=[。！？])/)[0] || clean;
  if (firstSent.length <= maxChars) {
    return /[。！？]$/.test(firstSent) ? firstSent : `${firstSent}。`;
  }
  const commaCut = firstSent.slice(0, maxChars).lastIndexOf('，');
  const trimmed = commaCut > 18 ? firstSent.slice(0, commaCut) : firstSent.slice(0, maxChars);
  return /[。！？]$/.test(trimmed) ? trimmed : `${trimmed}。`;
}

const items = [];

for (const era of ERAS) {
  const overview = conciseSentence(era.overview.geopolitics, 44);
  items.push({
    key: `ticker:era:${era.id}`,
    kind: 'ticker',
    subtype: 'era',
    id: era.id,
    title: era.name,
    file: `ticker/era/${era.id}.mp3`,
    script: `进入${era.name}，${formatYear(era.startYear)}至${formatYear(era.endYear)}。${overview}`,
  });

  for (const sp of era.subPeriods) {
    const summary = conciseSentence(sp.themeSummary, 48);
    items.push({
      key: `ticker:sp:${sp.id}`,
      kind: 'ticker',
      subtype: 'subperiod',
      id: sp.id,
      title: `${era.shortName} · ${sp.name}`,
      file: `ticker/subperiod/${sp.id}.mp3`,
      script: `${sp.name}，${summary}`,
    });
  }
}

for (const ev of ALL_EVENTS) {
  const summary = conciseSentence(ev.card.summary, 52);
  items.push({
    key: `ticker:ev:${ev.id}`,
    kind: 'ticker',
    subtype: 'event',
    id: ev.id,
    title: ev.title,
    file: `ticker/event/${ev.id}.mp3`,
    script: `${ev.dateDisplay}，${ev.title}。${summary}`,
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
