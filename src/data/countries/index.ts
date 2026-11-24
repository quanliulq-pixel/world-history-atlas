import { ALL_EVENTS, EVENT_MAP } from '../events';
import { ALL_FIGURES, FIGURE_MAP } from '../figures';
import { getPolityDisplay, isDiffuseCulture } from '../polityNames';
import { formatShortYear } from '../../utils/timeline';
import type {
  ClickedPolityPayload,
  CountryEvolutionIndex,
  CountryEvolutionProfile,
  CountryEvolutionStage,
  CountrySnapshotEntry,
  HistoricalFigure,
  HistoryEvent,
  ModernCountryIndexEntry,
  ResolvedCountryEvolution,
  WorldRegion,
} from '../../types/history';
import { ASIA_COUNTRY_PROFILES } from './asia';
import { EUROPE_COUNTRY_PROFILES } from './europe';
import { ME_AFRICA_AMERICAS_PROFILES } from './meAfricaAmericas';

export const COUNTRY_PROFILES: CountryEvolutionProfile[] = [
  ...ASIA_COUNTRY_PROFILES,
  ...EUROPE_COUNTRY_PROFILES,
  ...ME_AFRICA_AMERICAS_PROFILES,
];

export const COUNTRY_PROFILE_MAP: Record<string, CountryEvolutionProfile> = Object.fromEntries(
  COUNTRY_PROFILES.map((c) => [c.id, c]),
);

const PROFILE_BY_MODERN_KEY: Map<string, CountryEvolutionProfile> = new Map(
  COUNTRY_PROFILES.map((c) => [c.modernCountryKey.toLowerCase(), c]),
);

let indexCache: CountryEvolutionIndex | null = null;
let indexPromise: Promise<CountryEvolutionIndex> | null = null;

export async function loadCountryEvolutionIndex(): Promise<CountryEvolutionIndex> {
  if (indexCache) return indexCache;
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/country-evolution-index.json`);
    if (!res.ok) {
      throw new Error(`Failed to load country evolution index: HTTP ${res.status}`);
    }
    const json = (await res.json()) as CountryEvolutionIndex;
    indexCache = json;
    return json;
  })();

  try {
    return await indexPromise;
  } catch (err) {
    indexPromise = null;
    throw err;
  }
}

const POLITY_ZH_OVERRIDES: Record<string, string> = {
  'Korea, Republic of': '韩国',
  "Korea, Democratic People's Republic of": '朝鲜',
  'United Republic of': '坦桑尼亚',
  'Tanzania, United Republic of': '坦桑尼亚',
  'Chinese Warlords': '北洋与民国诸系',
  'Chinese warlords': '民国时期诸系',
  'USSR': '苏联',
  'Russia': '俄罗斯',
};

function cleanLedgerZhName(entry: CountrySnapshotEntry): string {
  if (POLITY_ZH_OVERRIDES[entry.enName]) return POLITY_ZH_OVERRIDES[entry.enName];
  if (POLITY_ZH_OVERRIDES[entry.zhName]) return POLITY_ZH_OVERRIDES[entry.zhName];
  if (entry.zhName === entry.enName) {
    return getPolityDisplay(entry.enName, entry.groupEnName).zhName;
  }
  return entry.zhName;
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const trimmed = s.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function findModernCountryEntry(
  modernKey: string,
  index: CountryEvolutionIndex | null,
): ModernCountryIndexEntry | null {
  if (!index) return null;
  if (index.modernCountries[modernKey]) return index.modernCountries[modernKey];
  const lower = modernKey.toLowerCase();
  for (const [k, entry] of Object.entries(index.modernCountries)) {
    if (k.toLowerCase() === lower) return entry;
  }
  return null;
}

function inferRegionFromCoords([lng, lat]: [number, number]): WorldRegion {
  if (lng < -30) return 'americas';
  if (lat > 35 && lng >= -12 && lng <= 60) return 'europe';
  if (lng >= -20 && lng <= 52 && lat >= -36 && lat < 36) {
    return lng >= 34 && lat >= 12 ? 'middle-east' : 'africa';
  }
  if (lng > 30 && lng <= 68 && lat >= 12 && lat <= 44) return 'middle-east';
  if (lng > 60 && lng <= 102 && lat < 34) return 'south-asia';
  if (lng >= 95 && lng <= 145 && lat < 23) return 'south-asia';
  if (lng >= 95 && lat >= 20) return 'east-asia';
  return 'global';
}

export function resolveCuratedCountry(
  profile: CountryEvolutionProfile,
  index: CountryEvolutionIndex | null,
  clickedPolity: ClickedPolityPayload | null = null,
  localAlternative: ResolvedCountryEvolution['localAlternative'] = null,
): ResolvedCountryEvolution {
  const mc = findModernCountryEntry(profile.modernCountryKey, index);
  const snapshotLedger: CountrySnapshotEntry[] = (mc?.timeline || []).map((t) => ({
    ...t,
    zhName: cleanLedgerZhName(t),
  }));

  const stagePolities = profile.stages.flatMap((st) => st.polityNames || []);
  const ledgerNonDiffuseEn = snapshotLedger
    .filter((t) => !isDiffuseCulture(t.enName, t.groupEnName))
    .map((t) => t.enName);
  const ledgerNonDiffuseZh = snapshotLedger
    .filter((t) => !isDiffuseCulture(t.enName, t.groupEnName))
    .map((t) => t.zhName);

  const highlightEnNames = dedupeStrings([
    ...profile.matchEnNames,
    ...stagePolities,
    ...ledgerNonDiffuseEn,
  ]);
  const highlightZhNames = dedupeStrings([
    ...(profile.matchZhNames || []),
    ...ledgerNonDiffuseZh,
  ]);

  const events: HistoryEvent[] = [];
  const seenEv = new Set<string>();
  for (const id of profile.eventIds) {
    const ev = EVENT_MAP[id];
    if (ev && !seenEv.has(ev.id)) {
      seenEv.add(ev.id);
      events.push(ev);
    }
  }
  events.sort((a, b) => a.year - b.year);

  const figures: HistoricalFigure[] = [];
  const seenFig = new Set<string>();
  for (const id of profile.figureIds) {
    const fig = FIGURE_MAP[id];
    if (fig && !seenFig.has(fig.id)) {
      seenFig.add(fig.id);
      figures.push(fig);
    }
  }
  figures.sort((a, b) => a.activeYear - b.activeYear);

  return {
    id: profile.id,
    name: profile.name,
    enName: profile.enName,
    region: profile.region,
    accentColor: profile.accentColor,
    coords: profile.coords,
    zoom: profile.zoom,
    tagline: profile.tagline,
    isCurated: true,
    clickedPolity,
    localAlternative,
    overview: profile.overview,
    stages: profile.stages,
    snapshotLedger,
    highlightEnNames,
    highlightZhNames,
    events,
    figures,
  };
}

function buildDynamicStagesFromLedger(
  zhName: string,
  enName: string,
  ledger: CountrySnapshotEntry[],
  snapshotYears: number[],
): CountryEvolutionStage[] {
  if (ledger.length === 0) {
    return [
      {
        id: 'dyn-stage-only',
        name: `${zhName} 当代格局`,
        periodDisplay: '当代版图',
        startYear: 1991,
        endYear: 2025,
        snapshotYear: 2010,
        polityNames: [enName],
        summary: `该政区对应当代国家「${zhName}」（${enName}），可结合左侧地图与时间轴溯源不同历史时期的区域统治势力变迁。`,
        politics: '处于近现代主权边界确立及融入国际多边体系阶段。',
        economy: '依托本地区自然地理禀赋及跨区域经贸通道展开现代经济建设。',
        culture: '融合历史上多波族群交流与当代本土国民文化认同。',
      },
    ];
  }

  // Merge consecutive identical polities into cohesive historical stages
  const groups: {
    zhName: string;
    enName: string;
    startYear: number;
    endYear: number;
    snapshotYear: number;
    peakArea: number;
    polityEnNames: string[];
  }[] = [];

  for (let i = 0; i < ledger.length; i++) {
    const item = ledger[i];
    const last = groups[groups.length - 1];
    const nextSnap = ledger[i + 1]?.year ?? 2025;
    if (last && (last.zhName === item.zhName || last.enName === item.enName)) {
      last.endYear = nextSnap > last.endYear ? nextSnap : item.year;
      if (item.area >= last.peakArea) {
        last.peakArea = item.area;
        last.snapshotYear = item.year;
      }
      if (!last.polityEnNames.includes(item.enName)) last.polityEnNames.push(item.enName);
    } else {
      const snapIdx = snapshotYears.indexOf(item.year);
      const endGuess =
        snapIdx !== -1 && snapIdx < snapshotYears.length - 1
          ? snapshotYears[snapIdx + 1]
          : 2025;
      groups.push({
        zhName: item.zhName,
        enName: item.enName,
        startYear: item.year,
        endYear: endGuess,
        snapshotYear: item.year,
        peakArea: item.area,
        polityEnNames: [item.enName],
      });
    }
  }

  // If > 9 micro-groups, compress ultra-short diffuse entries into readable stages (keep sovereign states)
  const trimmed =
    groups.length <= 8
      ? groups
      : groups.filter((g, idx) => {
          if (idx === 0 || idx === groups.length - 1) return true;
          return !isDiffuseCulture(g.enName) || g.endYear - g.startYear >= 400;
        });

  return trimmed.map((g, idx) => {
    const spanLabel = `${formatShortYear(g.startYear)} — ${
      g.endYear >= 2025 ? '今' : formatShortYear(g.endYear)
    }`;
    const isSelf = g.enName.toLowerCase() === enName.toLowerCase() || g.zhName === zhName;
    return {
      id: `dyn-stage-${idx}-${g.snapshotYear}`,
      name: isSelf ? `${g.zhName} 主权时期` : `${g.zhName} 统治/文化时期`,
      periodDisplay: spanLabel,
      startYear: g.startYear,
      endYear: g.endYear,
      snapshotYear: g.snapshotYear,
      polityNames: g.polityEnNames,
      summary: isSelf
        ? `在约 ${spanLabel} 的历史截面中，该地区呈现为以「${g.zhName}」为主体的主权与核心统治形态，可在左侧地图直接定位至 ${formatShortYear(g.snapshotYear)} 版图状态。`
        : `在约 ${spanLabel} 之间，今日「${zhName}」核心腹地先后归属或深处「${g.zhName}（${g.enName}）」版图控制或文化辐射圈内。`,
      politics: `截面峰值控制参考尺度约 ${g.peakArea} 地理单元，反映该时期该政权在区域政治博弈中的整合力度。`,
      economy: '结合周围商贸路网与该时期帝国腹地交换物资，逐步连接跨区经贸板块。',
      culture: '留下多层次地名、语言、建筑遗存或制度风俗烙印，构成现代国家历史记忆底色。',
    };
  });
}

function collectNearbyEventsAndFigures(
  center: [number, number],
  bbox: [number, number, number, number],
): { events: HistoryEvent[]; figures: HistoricalFigure[] } {
  const pad = 12;
  const inBox = (c: [number, number]) =>
    c[0] >= bbox[0] - pad &&
    c[0] <= bbox[2] + pad &&
    c[1] >= bbox[1] - pad &&
    c[1] <= bbox[3] + pad;

  const dist = (a: [number, number], b: [number, number]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1]);

  const matchedEvents = ALL_EVENTS.filter((ev) => inBox(ev.coords) || dist(ev.coords, center) <= 16)
    .sort((a, b) => dist(a.coords, center) - dist(b.coords, center))
    .slice(0, 14)
    .sort((a, b) => a.year - b.year);

  const matchedFigures = ALL_FIGURES.filter(
    (fig) => inBox(fig.coords) || dist(fig.coords, center) <= 16,
  )
    .sort((a, b) => dist(a.coords, center) - dist(b.coords, center))
    .slice(0, 10)
    .sort((a, b) => a.activeYear - b.activeYear);

  return { events: matchedEvents, figures: matchedFigures };
}

export function resolveModernCountry(
  modernKey: string,
  index: CountryEvolutionIndex | null,
  clickedPolity: ClickedPolityPayload | null = null,
): ResolvedCountryEvolution | null {
  const curated = PROFILE_BY_MODERN_KEY.get(modernKey.toLowerCase());
  if (curated) {
    return resolveCuratedCountry(curated, index, clickedPolity, null);
  }

  const mc = findModernCountryEntry(modernKey, index);
  if (!mc) return null;

  const displayZh = cleanLedgerZhName({
    year: 2010,
    enName: mc.enName,
    groupEnName: mc.enName,
    zhName: mc.zhName,
    area: 0,
  });

  const snapshotLedger = mc.timeline.map((t) => ({
    ...t,
    zhName: cleanLedgerZhName(t),
  }));

  const stages = buildDynamicStagesFromLedger(
    displayZh,
    mc.enName,
    snapshotLedger,
    index?.snapshotYears || [],
  );

  const spanLon = Math.abs(mc.bbox[2] - mc.bbox[0]);
  const spanLat = Math.abs(mc.bbox[3] - mc.bbox[1]);
  const maxSpan = Math.max(spanLon, spanLat);
  const zoom = Math.max(2.6, Math.min(5.4, 6.2 - Math.log2(Math.max(1.5, maxSpan)) * 0.85));

  const nonDiffuseEn = snapshotLedger
    .filter((t) => !isDiffuseCulture(t.enName, t.groupEnName))
    .map((t) => t.enName);
  const nonDiffuseZh = snapshotLedger
    .filter((t) => !isDiffuseCulture(t.enName, t.groupEnName))
    .map((t) => t.zhName);

  const { events, figures } = collectNearbyEventsAndFigures(mc.center, mc.bbox);
  const region = inferRegionFromCoords(mc.center);

  return {
    id: `modern-${mc.enName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: displayZh,
    enName: mc.enName,
    region,
    accentColor: clickedPolity?.fillColor || '#8A5D3B',
    coords: mc.center,
    zoom: Number(zoom.toFixed(2)),
    tagline: `跨越 ${snapshotLedger.length} 期世界历史疆域截面的「${displayZh}」疆土更迭脉络`,
    isCurated: false,
    clickedPolity,
    localAlternative: null,
    overview: {
      geography: `核心腹地坐标约 (${mc.center[0]}°, ${mc.center[1]}°)，在不同历史截面下先后受区域海陆地形走廊、交通要道与地缘力量推拉塑形。`,
      politics: `历经共 ${stages.length} 个主要政权与文化演进阶段，从早期地方社群/广域帝国统辖演变至当代民族国家边界。`,
      economy: '自前现代农牧贸易网络起步，伴随全球化与工业技术传播逐步汇入现代区域经贸体系。',
      culture: '每一轮疆域更替都在语言、信仰、地名与生活制度层面上叠合出今日独特的本土文明风貌。',
    },
    stages,
    snapshotLedger,
    highlightEnNames: dedupeStrings([mc.enName, ...nonDiffuseEn]),
    highlightZhNames: dedupeStrings([displayZh, ...nonDiffuseZh]),
    events,
    figures,
  };
}

function findLocalModernKey(
  clicked: ClickedPolityPayload,
  index: CountryEvolutionIndex | null,
): string | null {
  if (!index) return null;

  // First check direct exact match with modern country name
  const direct =
    findModernCountryEntry(clicked.enName, index) ||
    findModernCountryEntry(clicked.groupEnName, index);
  if (direct) return direct.enName;

  // Next check clicked point inside modern country primary bbox (smallest matching area first)
  const [lng, lat] = clicked.coords;
  const bboxCandidates: { key: string; area: number; dist: number }[] = [];
  for (const [k, mc] of Object.entries(index.modernCountries)) {
    const [minX, minY, maxX, maxY] = mc.bbox;
    if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY) {
      const boxArea = Math.max(0.1, (maxX - minX) * (maxY - minY));
      const d = Math.hypot(mc.center[0] - lng, mc.center[1] - lat);
      bboxCandidates.push({ key: k, area: boxArea, dist: d });
    }
  }
  if (bboxCandidates.length > 0) {
    bboxCandidates.sort((a, b) => a.dist * 2 + Math.sqrt(a.area) - (b.dist * 2 + Math.sqrt(b.area)));
    return bboxCandidates[0].key;
  }

  // Fallback to polity index home core country if available
  const polEntry = index.polities[clicked.enName] || index.polities[clicked.groupEnName];
  if (polEntry?.modernCountry) return polEntry.modernCountry;

  // Nearest modern country center within reasonable radius
  let bestKey: string | null = null;
  let bestDist = 18;
  for (const [k, mc] of Object.entries(index.modernCountries)) {
    const d = Math.hypot(mc.center[0] - lng, mc.center[1] - lat);
    if (d < bestDist) {
      bestDist = d;
      bestKey = k;
    }
  }
  return bestKey;
}

function matchCuratedProfileByClicked(clicked: ClickedPolityPayload): CountryEvolutionProfile | null {
  const candidates = [clicked.enName, clicked.groupEnName].filter(Boolean);
  const zhCandidates = [clicked.zhName, clicked.groupZhName].filter(Boolean);

  for (const profile of COUNTRY_PROFILES) {
    for (const c of candidates) {
      if (profile.matchEnNames.some((n) => n.toLowerCase() === c.toLowerCase())) {
        return profile;
      }
    }
    for (const zc of zhCandidates) {
      if (profile.matchZhNames?.some((n) => n === zc)) {
        return profile;
      }
    }
  }

  for (const profile of COUNTRY_PROFILES) {
    if (!profile.matchEnPatterns) continue;
    for (const pat of profile.matchEnPatterns) {
      const re = new RegExp(pat, 'i');
      if (candidates.some((c) => re.test(c))) return profile;
    }
  }

  return null;
}

export function resolveCountryEvolution(
  clicked: ClickedPolityPayload,
  index: CountryEvolutionIndex | null,
): ResolvedCountryEvolution {
  const localModernKey = findLocalModernKey(clicked, index);
  const directProfile = matchCuratedProfileByClicked(clicked);

  if (directProfile) {
    let localAlt: ResolvedCountryEvolution['localAlternative'] = null;
    if (
      localModernKey &&
      localModernKey.toLowerCase() !== directProfile.modernCountryKey.toLowerCase()
    ) {
      const localMc = findModernCountryEntry(localModernKey, index);
      if (localMc) {
        localAlt = {
          modernCountryKey: localMc.enName,
          zhName: cleanLedgerZhName({
            year: 2010,
            enName: localMc.enName,
            groupEnName: localMc.enName,
            zhName: localMc.zhName,
            area: 0,
          }),
          enName: localMc.enName,
          coords: localMc.center,
        };
      }
    }
    return resolveCuratedCountry(directProfile, index, clicked, localAlt);
  }

  if (localModernKey) {
    const resolved = resolveModernCountry(localModernKey, index, clicked);
    if (resolved) return resolved;
  }

  // Standalone fallback if clicking an off-modern or diffuse frontier polity without modern anchor
  const polMeta = index?.polities[clicked.enName] || index?.polities[clicked.groupEnName];
  const center = polMeta?.center || clicked.coords;
  const fallbackLedger: CountrySnapshotEntry[] = (polMeta?.years || [clicked.snapshotYear]).map((yr) => ({
    year: yr,
    enName: clicked.enName,
    groupEnName: clicked.groupEnName || clicked.enName,
    zhName: clicked.zhName,
    area: yr === polMeta?.peakYear ? polMeta.peakArea : 10,
  }));
  const stages = buildDynamicStagesFromLedger(
    clicked.zhName,
    clicked.enName,
    fallbackLedger,
    index?.snapshotYears || [],
  );
  const { events, figures } = collectNearbyEventsAndFigures(center, [
    center[0] - 8,
    center[1] - 8,
    center[0] + 8,
    center[1] + 8,
  ]);

  return {
    id: `polity-${clicked.enName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: clicked.zhName,
    enName: clicked.enName,
    region: inferRegionFromCoords(center),
    accentColor: clicked.fillColor || '#8A5D3B',
    coords: center,
    zoom: 3.8,
    tagline: `公元 ${formatShortYear(clicked.snapshotYear)} 版图上的历史政权「${clicked.zhName}」`,
    isCurated: false,
    clickedPolity: clicked,
    localAlternative: null,
    overview: {
      geography: `位于 (${center[0]}°, ${center[1]}°) 一带，在 ${formatShortYear(clicked.snapshotYear)} 历史切片中呈现鲜明地域存在。`,
      politics: `共见于 ${fallbackLedger.length} 个全球历史版图截面，峰值参考活跃年份约为 ${formatShortYear(polMeta?.peakYear ?? clicked.snapshotYear)}。`,
      economy: '深度依托周边河谷绿洲或沿海通道融入同期区域物产流转。',
      culture: '保留下具有显著辨识度的历史地名与政权制度谱系记忆。',
    },
    stages,
    snapshotLedger: fallbackLedger,
    highlightEnNames: dedupeStrings([clicked.enName, clicked.groupEnName]),
    highlightZhNames: dedupeStrings([clicked.zhName, clicked.groupZhName]),
    events,
    figures,
  };
}

export function findMatchingStageIndex(
  stages: CountryEvolutionStage[],
  year: number,
): number {
  if (stages.length === 0) return -1;
  const exactIdx = stages.findIndex((st) => year >= st.startYear && year <= st.endYear);
  if (exactIdx !== -1) return exactIdx;

  let bestIdx = 0;
  let bestDist = Math.abs(year - stages[0].snapshotYear);
  for (let i = 1; i < stages.length; i++) {
    const d = Math.abs(year - stages[i].snapshotYear);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}
