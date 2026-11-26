import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRY_PROFILES } from '../src/data/countries/index.ts';
import { EVENT_MAP } from '../src/data/events/index.ts';
import { STORYLINES } from '../src/data/storylines.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT_DIR, 'colab', 'extras-audio-scripts.json');

function normalizeSpoken(text) {
  if (!text) return '';
  return String(text)
    .replace(/[*_`#>~]/g, '')
    .replace(/（[^（）]{0,28}）/g, (m) => (m.length <= 12 ? m : ''))
    .replace(/\([^()]{0,28}\)/g, '')
    .replace(/[“”]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[；;]+/g, '，')
    .trim();
}

function conciseSentences(text, maxChars = 115) {
  const clean = normalizeSpoken(text);
  if (!clean) return '';
  if (clean.length <= maxChars) {
    return /[。！？]$/.test(clean) ? clean : `${clean}。`;
  }
  const parts = clean.split(/(?<=[。！？])/);
  let out = '';
  for (const p of parts) {
    if (!out) out = p;
    else if (out.length + p.length <= maxChars) out += p;
    else break;
  }
  if (out.length > maxChars + 14) {
    const cut = out.slice(0, maxChars).lastIndexOf('，');
    out = cut > 22 ? `${out.slice(0, cut)}。` : `${out.slice(0, maxChars)}。`;
  }
  return /[。！？]$/.test(out) ? out : `${out}。`;
}

const items = [];

// 1. Curated Country Evolution Stages (85 clips)
for (const country of COUNTRY_PROFILES) {
  for (const stage of country.stages) {
    const body = conciseSentences(`${stage.summary} ${stage.politics}`, 115);
    items.push({
      key: `country:${country.id}:${stage.id}`,
      kind: 'country',
      id: `${country.id}:${stage.id}`,
      title: `${country.name} · ${stage.name}`,
      file: `country/${country.id}/${stage.id}.mp3`,
      script: `${country.name}，${stage.periodDisplay}，${stage.name}。${body}`,
    });
  }
}

// 2. Curated Thematic Storyline Steps (all 10 storylines)
for (const storyline of STORYLINES) {
  storyline.steps.forEach((step, idx) => {
    const ev = EVENT_MAP[step.eventId];
    const titlePrefix = ev ? `${ev.dateDisplay}，${ev.title}。` : '';
    const script = conciseSentences(`${titlePrefix}${step.narrative}`, 128);
    items.push({
      key: `story:${storyline.id}:${idx}`,
      kind: 'story',
      id: `${storyline.id}:${idx}`,
      title: `${storyline.title} (${idx + 1}/${storyline.steps.length})`,
      file: `story/${storyline.id}/step-${idx}.mp3`,
      script,
    });
  });
}

const counts = {
  total: items.length,
  countryStages: items.filter((i) => i.kind === 'country').length,
  storylineSteps: items.filter((i) => i.kind === 'story').length,
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

const empty = items.filter((i) => !i.script.trim()).length;
console.log(
  `Exported ${counts.total} extras audio scripts (countryStages=${counts.countryStages}, storylineSteps=${counts.storylineSteps}) -> ${path.relative(ROOT_DIR, OUT_FILE)} | empty=${empty}`,
);
