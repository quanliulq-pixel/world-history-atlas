import type { CountryFocusSpec } from '../components/WorldMap';
import { COUNTRY_PROFILES } from '../data/countries';
import { DIMENSION_META, REGION_META } from '../data/eras';
import type { CountryEvolutionProfile, HistoryEvent } from '../types/history';
import type { AiStoryboardFlow } from './aiClient';
import type { DecodedSnapshot } from './snapshotLoader';

export type VisualConceptKind =
  | 'military'
  | 'economy'
  | 'voyage'
  | 'ecology'
  | 'crisis'
  | 'institution'
  | 'culture'
  | 'tech';

export interface SpokenVisualConcept {
  kind: VisualConceptKind;
  label: string;
  color: string;
  keywords: string[];
  flowSteps: string[];
}

export interface FocusedCountryItem {
  id?: string;
  label: string;
  coords: [number, number];
  zoom: number;
  color: string;
}

export interface NarrationFocusMatch {
  key: string;
  countryFocus: CountryFocusSpec | null;
  matchedCountries: FocusedCountryItem[];
  cameraCenter: [number, number] | null;
  cameraZoom: number | null;
  interactionFlows: AiStoryboardFlow[];
  concept: SpokenVisualConcept;
}

const COUNTRY_ALIASES: Array<{ id: string; terms: string[] }> = [
  {
    id: 'china',
    terms: [
      '中华人民共和国',
      '新中国',
      '中国',
      '中华',
      '中原',
      '明朝',
      '明清',
      '大明',
      '清朝',
      '大清',
      '康乾',
      '晚清',
      '鸦片战争',
      '秦朝',
      '秦始皇',
      '汉朝',
      '西汉',
      '东汉',
      '汉武帝',
      '唐朝',
      '盛唐',
      '隋唐',
      '长安',
      '宋朝',
      '北宋',
      '南宋',
      '元朝',
      '商朝',
      '西周',
      '东周',
      '战国',
      '春秋',
      '改革开放',
    ],
  },
  {
    id: 'india',
    terms: ['莫卧儿', '印度', '南亚', '德里', '孔雀王朝', '阿育王', '摩亨佐达罗', '印度河', '恒河', '加尔各答', '卡利卡特', '印巴'],
  },
  {
    id: 'turkey',
    terms: ['奥斯曼', '君士坦丁堡', '土耳其', '安纳托利亚', '伊斯坦布尔', '赫梯', '博斯普鲁斯'],
  },
  {
    id: 'iran',
    terms: ['萨法维', '波斯', '伊朗', '伊斯法罕', '大流士', '居鲁士', '萨珊'],
  },
  {
    id: 'spain',
    terms: ['西班牙', '塞维利亚', '卡斯蒂利亚', '伊莎贝拉', '伊比利亚'],
  },
  {
    id: 'portugal',
    terms: ['葡萄牙', '里斯本', '好望角', '果阿'],
  },
  {
    id: 'britain',
    terms: ['英国', '英格兰', '不列颠', '大英帝国', '伦敦', '兰开夏', '东印度公司'],
  },
  {
    id: 'france',
    terms: ['法国', '法兰西', '巴黎', '拿破仑', '凡尔赛'],
  },
  {
    id: 'germany',
    terms: ['德国', '德意志', '普鲁士', '柏林', '神圣罗马帝国', '魏玛'],
  },
  {
    id: 'russia',
    terms: ['俄罗斯', '俄国', '苏联', '莫斯科', '彼得格勒', '基辅罗斯', '钦察', '沙俄'],
  },
  {
    id: 'italy',
    terms: ['罗马', '意大利', '威尼斯', '佛罗伦萨', '美第奇', '米兰', '教皇'],
  },
  {
    id: 'netherlands',
    terms: ['荷兰', '尼德兰', '阿姆斯特丹', 'VOC'],
  },
  {
    id: 'austria',
    terms: ['奥地利', '奥匈', '维也纳', '哈布斯堡'],
  },
  {
    id: 'poland',
    terms: ['波兰', '立陶宛', '华沙'],
  },
  {
    id: 'sweden',
    terms: ['瑞典', '维京', '北欧'],
  },
  {
    id: 'greece',
    terms: ['希腊', '雅典', '马其顿', '斯巴达', '亚历山大', '爱琴海'],
  },
  {
    id: 'arabia',
    terms: ['阿拉伯', '哈里发', '巴格达', '美索不达米亚', '苏美尔', '巴比伦', '两河流域', '黎凡特', '麦加', '耶路撒冷'],
  },
  {
    id: 'egypt',
    terms: ['埃及', '法老', '尼罗河', '孟菲斯', '开罗', '苏伊士', '亚历山大港'],
  },
  {
    id: 'mongolia',
    terms: ['蒙古', '成吉思汗', '铁木真', '忽必烈', '大都', '匈奴', '突厥'],
  },
  {
    id: 'japan',
    terms: ['日本', '德川', '幕府', '明治', '东京', '江户', '京都'],
  },
  {
    id: 'korea',
    terms: ['朝鲜', '韩国', '高丽', '首尔'],
  },
  {
    id: 'vietnam',
    terms: ['越南', '交趾', '安南'],
  },
  {
    id: 'thailand',
    terms: ['泰国', '暹罗', '吴哥', '中南半岛'],
  },
  {
    id: 'indonesia',
    terms: ['印度尼西亚', '印尼', '爪哇', '马六甲', '香料群岛', '三佛齐', '满者伯夷'],
  },
  {
    id: 'usa',
    terms: ['美国', '美利坚', '华盛顿', '纽约', '华尔街', '北美', '硅谷'],
  },
  {
    id: 'mexico',
    terms: ['墨西哥', '阿兹特克', '特诺奇蒂特兰', '玛雅', '奥尔梅克'],
  },
  {
    id: 'peru',
    terms: ['秘鲁', '印加', '波托西', '安第斯', '库斯科'],
  },
  {
    id: 'brazil',
    terms: ['巴西', '里约'],
  },
  {
    id: 'ethiopia',
    terms: ['埃塞俄比亚', '阿克苏姆'],
  },
  {
    id: 'west-africa',
    terms: ['马里', '桑海', '廷巴克图', '西非', '加纳'],
  },
];

const PROFILE_MAP = Object.fromEntries(
  COUNTRY_PROFILES.map((p) => [p.id, p]),
) as Record<string, CountryEvolutionProfile>;

interface ConceptRule {
  kind: VisualConceptKind;
  label: string;
  color: string;
  patterns: RegExp;
  defaultSteps: string[];
}

const CONCEPT_RULES: ConceptRule[] = [
  {
    kind: 'voyage',
    label: '跨洋航线与海权探索',
    color: '#0284C7',
    patterns: /航|船队|远洋|大发现|绕过好望角|信风|大帆船|海权|海峡|舰队|殖民港口/,
    defaultSteps: ['突破海上天堑', '掌控咽喉港埠', '重塑跨洋版图'],
  },
  {
    kind: 'military',
    label: '地缘征伐与权力角逐',
    color: '#DC2626',
    patterns: /战|征服|军团|火炮|火枪|起义|革命|帝国|兼并|割据|防线|条约|崩溃|解体|同盟|博弈|政变/,
    defaultSteps: ['矛盾与危机积聚', '武力或制度洗牌', '重划疆域秩序'],
  },
  {
    kind: 'economy',
    label: '货币贸易与资本流动',
    color: '#D97706',
    patterns: /银|金本位|贸易|商业|税|财政|纸币|交子|银行|复式记账|股市|危机|萧条|制造|供应链|棉花|丝绸|香料/,
    defaultSteps: ['资源与货币聚流', '商网金融放大', '改写财政与分工'],
  },
  {
    kind: 'tech',
    label: '能源跃迁与科学发明',
    color: '#2563EB',
    patterns: /蒸汽|铁路|电|算力|互联网|AI|人工智能|活字印刷|造纸|火药|指南针|芯片|发明|工业|实验室|专利/,
    defaultSteps: ['技术瓶颈突破', '生产效率指数跃迁', '重构产业与社会'],
  },
  {
    kind: 'ecology',
    label: '物种交换与生态迁移',
    color: '#059669',
    patterns: /物种|玉米|马铃薯|番薯|水稻|瘟疫|黑死病|天花|气候|小冰期|干旱|大交换|人口/,
    defaultSteps: ['生态条件突变', '跨洲物种与疫病传导', '人口与劳役重洗'],
  },
  {
    kind: 'culture',
    label: '思想宗教与文明互鉴',
    color: '#7C3AED',
    patterns: /宗教|基督教|伊斯兰|佛教|儒|法家|哲学|文艺复兴|启蒙|文字|史诗|法典|宪政|大学|翻译/,
    defaultSteps: ['新观念打破旧垄断', '印刷与商道扩散', '重塑文明精神底色'],
  },
  {
    kind: 'institution',
    label: '制度演进与国家治理',
    color: '#B45309',
    patterns: /变法|科举|郡县|分封|宪章|议会|主权|改革|官僚|内阁|联邦/,
    defaultSteps: ['旧体制承载极限', '制度与税制重造', '释放国家动员力'],
  },
];

const CONCEPT_KEYWORD_DICT = [
  '白银回流',
  '一条鞭法',
  '哥伦布大交换',
  '黑死病',
  '蒸汽机',
  '复式记账',
  '大宪章',
  '宗教改革',
  '科学革命',
  '工业革命',
  '丝绸之路',
  '马尼拉大帆船',
  '三角贸易',
  '布雷顿森林',
  '改革开放',
  '生成式 AI',
  '科举制',
  '郡县制',
  '威斯特伐利亚',
  '火药帝国',
  '重商主义',
  '全球分工',
  '非殖民化',
  '光荣革命',
  '十月革命',
  '大萧条',
  '金本位',
  '城市自治',
  '活字印刷',
  '造纸术',
  '多极格局',
];

export function extractSpokenVisualConcept(
  text: string,
  event?: HistoryEvent | null,
): SpokenVisualConcept {
  const cleaned = text.trim();
  let matchedRule = CONCEPT_RULES[1];
  let bestHits = 0;

  for (const rule of CONCEPT_RULES) {
    const matches = cleaned.match(new RegExp(rule.patterns.source, 'g'));
    const hits = matches ? matches.length : 0;
    if (hits > bestHits) {
      bestHits = hits;
      matchedRule = rule;
    }
  }

  if (bestHits === 0 && event) {
    if (event.primaryDimension === 'economy') matchedRule = CONCEPT_RULES[2];
    else if (event.primaryDimension === 'tech') matchedRule = CONCEPT_RULES[3];
    else if (event.primaryDimension === 'culture') matchedRule = CONCEPT_RULES[5];
    else matchedRule = CONCEPT_RULES[1];
  }

  const foundKeywords: string[] = [];
  for (const kw of CONCEPT_KEYWORD_DICT) {
    if (cleaned.includes(kw) && !foundKeywords.includes(kw)) {
      foundKeywords.push(kw);
      if (foundKeywords.length >= 3) break;
    }
  }

  if (foundKeywords.length < 3) {
    const extraMatches =
      cleaned.match(
        /(白银|黄金|棉花|香料|丝绸|玉米|马铃薯|煤炭|石油|铁器|青铜|火炮|帆船|铁路|芯片|文字|法典|印刷|税收|银行|关税|气候|疫情|殖民|宪政|议会|海权|商道)/g,
      ) || [];
    for (const token of extraMatches) {
      if (!foundKeywords.includes(token)) {
        foundKeywords.push(token);
        if (foundKeywords.length >= 4) break;
      }
    }
  }

  const flowSteps =
    foundKeywords.length >= 2
      ? [
          matchedRule.defaultSteps[0],
          `${foundKeywords.slice(0, 2).join(' · ')}推动演进`,
          matchedRule.defaultSteps[2],
        ]
      : matchedRule.defaultSteps;

  return {
    kind: matchedRule.kind,
    label: matchedRule.label,
    color: matchedRule.color,
    keywords: foundKeywords,
    flowSteps,
  };
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const t = s.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function buildCountryFocusFromItems(
  items: Array<{
    profile?: CountryEvolutionProfile;
    snapshotPolityNames?: string[];
    color: string;
  }>,
  accentColor: string,
): CountryFocusSpec | null {
  const enNames: string[] = [];
  const zhNames: string[] = [];

  for (const item of items) {
    if (item.profile) {
      enNames.push(...item.profile.matchEnNames);
      if (item.profile.matchZhNames) zhNames.push(...item.profile.matchZhNames);
      for (const st of item.profile.stages) {
        if (st.polityNames) enNames.push(...st.polityNames);
      }
    }
    if (item.snapshotPolityNames) {
      zhNames.push(...item.snapshotPolityNames);
    }
  }

  const matchEnNames = dedupeStrings(enNames);
  const matchZhNames = dedupeStrings(zhNames);
  if (matchEnNames.length === 0 && matchZhNames.length === 0) return null;

  return {
    accentColor,
    matchEnNames,
    matchZhNames,
  };
}

export function resolveNarrationVisualFocus(params: {
  text: string;
  event?: HistoryEvent | null;
  snapshot?: DecodedSnapshot | null;
  fallbackCenter?: [number, number];
  fallbackColor?: string;
}): NarrationFocusMatch {
  const { text, event, snapshot, fallbackCenter, fallbackColor } = params;
  const concept = extractSpokenVisualConcept(text, event);

  const hits: Array<{
    pos: number;
    id?: string;
    label: string;
    coords: [number, number];
    zoom: number;
    color: string;
    profile?: CountryEvolutionProfile;
    snapshotPolityNames?: string[];
  }> = [];

  const seenProfileIds = new Set<string>();

  // 1. Scan Chinese historical & modern aliases ordered by first appearance in text
  for (const entry of COUNTRY_ALIASES) {
    const profile = PROFILE_MAP[entry.id];
    if (!profile) continue;
    let earliest = Infinity;
    let matchedTerm = '';
    for (const term of entry.terms) {
      const idx = text.indexOf(term);
      if (idx !== -1 && idx < earliest) {
        earliest = idx;
        matchedTerm = term;
      }
    }
    if (earliest < Infinity && !seenProfileIds.has(profile.id)) {
      seenProfileIds.add(profile.id);
      hits.push({
        pos: earliest,
        id: profile.id,
        label: matchedTerm === profile.name ? profile.name : `${matchedTerm} · ${profile.name}`,
        coords: profile.coords,
        zoom: profile.zoom,
        color: profile.accentColor,
        profile,
      });
    }
  }

  // 2. Scan active snapshot polity labels directly in case narration names a historical polity not tied to a single alias (e.g. 花剌子模, 帖木儿, 卡尔马联盟, 马木留克)
  if (snapshot?.labels?.features?.length) {
    for (const feat of snapshot.labels.features) {
      const props = (feat.properties || {}) as { n?: string; p?: string };
      const zh = (props.n || '').trim();
      const geomCoords = (feat.geometry as GeoJSON.Point | undefined)?.coordinates;
      if (!zh || zh.length < 2 || !geomCoords || geomCoords.length < 2) continue;
      const idx = text.indexOf(zh);
      if (idx === -1) continue;

      const existing = hits.find(
        (h) =>
          h.profile?.matchZhNames?.includes(zh) ||
          Math.hypot(h.coords[0] - geomCoords[0], h.coords[1] - geomCoords[1]) < 4.5,
      );
      if (existing) {
        existing.snapshotPolityNames = [...(existing.snapshotPolityNames || []), zh];
        continue;
      }
      hits.push({
        pos: idx,
        label: zh,
        coords: [geomCoords[0], geomCoords[1]],
        zoom: 3.1,
        color: concept.color,
        snapshotPolityNames: [zh],
      });
    }
  }

  hits.sort((a, b) => a.pos - b.pos);
  let selectedHits = hits.slice(0, 3);

  // 3. Fallback to event-linked curated country profile if text contained no explicit polity mention
  if (selectedHits.length === 0 && event) {
    const linked = COUNTRY_PROFILES.find((p) => p.eventIds.includes(event.id));
    if (linked) {
      selectedHits = [
        {
          pos: 0,
          id: linked.id,
          label: linked.name,
          coords: linked.coords,
          zoom: linked.zoom,
          color: linked.accentColor,
          profile: linked,
        },
      ];
    } else {
      let bestDist = 18;
      let nearest: CountryEvolutionProfile | null = null;
      for (const p of COUNTRY_PROFILES) {
        const d = Math.hypot(p.coords[0] - event.coords[0], p.coords[1] - event.coords[1]);
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      }
      if (nearest) {
        selectedHits = [
          {
            pos: 0,
            id: nearest.id,
            label: nearest.name,
            coords: nearest.coords,
            zoom: nearest.zoom,
            color: nearest.accentColor,
            profile: nearest,
          },
        ];
      }
    }
  }

  const matchedCountries: FocusedCountryItem[] = selectedHits.map((h) => ({
    id: h.id,
    label: h.label,
    coords: h.coords,
    zoom: h.zoom,
    color: h.color,
  }));

  const accentColor =
    selectedHits[0]?.color ||
    (event ? DIMENSION_META[event.primaryDimension].color : fallbackColor) ||
    concept.color;

  const countryFocus = buildCountryFocusFromItems(selectedHits, accentColor);

  // Compute smart camera center & zoom framing single or multi-country interactions
  let cameraCenter: [number, number] | null = fallbackCenter ?? event?.coords ?? null;
  let cameraZoom: number | null = event ? (event.importance === 3 ? 3.2 : 3.5) : null;

  if (matchedCountries.length === 1) {
    const target = matchedCountries[0];
    if (
      event &&
      Math.hypot(target.coords[0] - event.coords[0], target.coords[1] - event.coords[1]) < 16
    ) {
      cameraCenter = [
        Number(((event.coords[0] * 0.6 + target.coords[0] * 0.4)).toFixed(2)),
        Number(((event.coords[1] * 0.6 + target.coords[1] * 0.4)).toFixed(2)),
      ];
      cameraZoom = Math.min(3.8, Math.max(2.6, target.zoom));
    } else {
      cameraCenter = target.coords;
      cameraZoom = target.zoom;
    }
  } else if (matchedCountries.length >= 2) {
    const a = matchedCountries[0];
    const b = matchedCountries[1];
    let lngB = b.coords[0];
    while (lngB - a.coords[0] > 180) lngB -= 360;
    while (lngB - a.coords[0] < -180) lngB += 360;
    const midLng = (a.coords[0] + lngB) / 2;
    const normMidLng = ((midLng + 180) % 360 + 360) % 360 - 180;
    const midLat = (a.coords[1] + b.coords[1]) / 2;
    const span = Math.hypot(lngB - a.coords[0], b.coords[1] - a.coords[1]);
    cameraCenter = [Number(normMidLng.toFixed(2)), Number(midLat.toFixed(2))];
    cameraZoom = span > 100 ? 1.55 : span > 55 ? 1.95 : span > 28 ? 2.45 : 3.0;
  }

  // Create animated cross-country interaction flows when 2+ countries appear together
  const flowKind: AiStoryboardFlow['kind'] =
    concept.kind === 'voyage'
      ? 'voyage'
      : concept.kind === 'military'
        ? 'military'
        : concept.kind === 'economy'
          ? 'trade'
          : concept.kind === 'ecology' || concept.kind === 'culture' || concept.kind === 'tech'
            ? 'diffusion'
            : 'influence';

  const interactionFlows: AiStoryboardFlow[] = [];
  for (let i = 0; i + 1 < matchedCountries.length; i++) {
    const fromC = matchedCountries[i];
    const toC = matchedCountries[i + 1];
    const shortA = fromC.label.split(' · ').pop() || fromC.label;
    const shortB = toC.label.split(' · ').pop() || toC.label;
    const tag = concept.keywords[0] || REGION_META[event?.region || 'global'].label;
    interactionFlows.push({
      from: fromC.coords,
      to: toC.coords,
      label: `${shortA}→${shortB}（${tag}）`.slice(0, 22),
      color: concept.color,
      kind: flowKind,
      bidirectional: flowKind === 'trade',
    });
  }

  const key = [
    selectedHits.map((h) => h.id || h.label).join('+'),
    concept.kind,
    event?.id || '',
  ].join('|');

  return {
    key,
    countryFocus,
    matchedCountries,
    cameraCenter,
    cameraZoom,
    interactionFlows,
    concept,
  };
}
