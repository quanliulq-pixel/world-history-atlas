import {
  ERA_CHRONICLE_BRIDGES,
  SUBPERIOD_CHRONICLE_NARRATIVES,
} from '../data/chronicleChapters';
import { DIMENSION_META, REGION_META } from '../data/eras';
import { ALL_EVENTS, EVENT_MAP } from '../data/events';
import { findFigureByName } from '../data/figures';
import { HISTORICAL_ROUTES } from '../data/routes';
import { getStoryEpisode, type StoryEpisode } from '../data/stories';
import type {
  Era,
  HistoricalFigure,
  HistoricalRoute,
  HistoryEvent,
  SubPeriod,
} from '../types/history';
import type {
  AiDocumentaryBeat,
  AiDocumentaryPlan,
  AiStoryboard,
  AiStoryboardFlow,
  AiStoryboardSpot,
  AiStoryboardSpotIcon,
  AiStoryboardStep,
} from './aiClient';
import { formatYear } from './timeline';

export type NarrationDepth = 'story' | 'concise';

const NARRATION_DEPTH_KEY = 'world-history-atlas:narration-depth:v1';
const ROUTE_MAP = Object.fromEntries(HISTORICAL_ROUTES.map((r) => [r.id, r]));

export function getStoredNarrationDepth(): NarrationDepth {
  try {
    const raw = localStorage.getItem(NARRATION_DEPTH_KEY);
    return raw === 'concise' ? 'concise' : 'story';
  } catch {
    return 'story';
  }
}

export function saveStoredNarrationDepth(depth: NarrationDepth): void {
  try {
    localStorage.setItem(NARRATION_DEPTH_KEY, depth);
  } catch {
    // Ignore storage errors
  }
}

function ensurePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[。！？…”』）]$/.test(trimmed) ? trimmed : `${trimmed}。`;
}

function inferFlowKind(route: HistoricalRoute): AiStoryboardFlow['kind'] {
  if (/航海|航|洋|郑和|麦哲伦|达·伽马|哥伦布|大帆船/.test(route.name)) {
    return 'voyage';
  }
  if (route.dimension === 'politics') return 'military';
  if (route.dimension === 'economy') return 'trade';
  return 'diffusion';
}

function pickDiverseRegionalEvents(
  candidates: HistoryEvent[],
  limit = 4,
): HistoryEvent[] {
  const sorted = [...candidates].sort((a, b) => b.importance - a.importance || a.year - b.year);
  const picked: HistoryEvent[] = [];
  const seenRegions = new Set<string>();

  for (const ev of sorted) {
    if (!seenRegions.has(ev.region)) {
      picked.push(ev);
      seenRegions.add(ev.region);
      if (picked.length >= limit) return picked;
    }
  }
  for (const ev of sorted) {
    if (!picked.includes(ev)) {
      picked.push(ev);
      if (picked.length >= limit) break;
    }
  }
  return picked;
}

export function buildEventCausalContext(ev: HistoryEvent): {
  causesText: string;
  effectsText: string;
  keyFiguresText: string;
} {
  const causeEvents = (ev.causes || [])
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));
  const effectEvents = (ev.effects || [])
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));

  const causesText =
    causeEvents.length > 0
      ? causeEvents
          .map((c) => `${c.dateDisplay}「${c.title}」（${c.card.summary}）`)
          .join('；')
      : '';

  const effectsText =
    effectEvents.length > 0
      ? effectEvents
          .map((e) => `${e.dateDisplay}「${e.title}」（${e.card.summary}）`)
          .join('；')
      : '';

  const keyFiguresList = (ev.card.keyFigures || [])
    .map((name) => {
      const fig = findFigureByName(name);
      return fig ? `${fig.name}（${fig.title}：${fig.card.oneLiner}）` : name;
    })
    .filter(Boolean);

  return {
    causesText,
    effectsText,
    keyFiguresText: keyFiguresList.join('；'),
  };
}

export function buildEventCinemaSteps(
  ev: HistoryEvent,
  beats: AiDocumentaryBeat[],
): AiStoryboardStep[] {
  const accent = DIMENSION_META[ev.primaryDimension].color;
  const regionLabel = REGION_META[ev.region].label;
  const causeEvents = (ev.causes || [])
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));
  const effectEvents = (ev.effects || [])
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));
  const linkedRoutes = (ev.routeIds || [])
    .map((id) => ROUTE_MAP[id])
    .filter((r): r is HistoricalRoute => Boolean(r));
  const keyFigures = (ev.card.keyFigures || [])
    .map((name) => findFigureByName(name))
    .filter((f): f is HistoricalFigure => Boolean(f));

  const fallbackNearbyCauses =
    causeEvents.length > 0
      ? causeEvents
      : ALL_EVENTS.filter(
          (cand) =>
            cand.id !== ev.id &&
            cand.eraId === ev.eraId &&
            cand.year <= ev.year &&
            Math.hypot(cand.coords[0] - ev.coords[0], cand.coords[1] - ev.coords[1]) > 2.5,
        )
          .slice(-2)
          .reverse();

  const baseZoom = ev.importance === 3 ? 3.15 : 3.5;

  // Step 0: 前因缘起与地理舞台
  const causeFlows: AiStoryboardFlow[] = fallbackNearbyCauses.slice(0, 3).map((c) => ({
    from: c.coords,
    to: ev.coords,
    label: c.title.slice(0, 10),
    color: '#D97706',
    kind: 'influence',
  }));
  const causeSpots: AiStoryboardSpot[] = [
    {
      coords: ev.coords,
      label: ev.locationName.slice(0, 12),
      sublabel: ev.dateDisplay,
      color: accent,
      icon: 'landmark',
    },
    ...fallbackNearbyCauses.slice(0, 3).map((c) => ({
      coords: c.coords,
      label: c.title.slice(0, 10),
      sublabel: c.dateDisplay,
      color: '#D97706',
      icon: 'city' as AiStoryboardSpotIcon,
    })),
  ];

  // Step 1: 核心权力博弈 / 人物与主干路线展开
  const primaryRouteFlows: AiStoryboardFlow[] = linkedRoutes.slice(0, 3).map((rt) => ({
    from: rt.waypoints[0] || ev.coords,
    to: rt.waypoints[rt.waypoints.length - 1] || ev.coords,
    waypoints: rt.waypoints.length >= 2 ? rt.waypoints : undefined,
    label: rt.name.slice(0, 16),
    color: rt.color,
    kind: inferFlowKind(rt),
    bidirectional: rt.bidirectional,
  }));
  const figureSpots: AiStoryboardSpot[] = keyFigures
    .filter((f) => Math.hypot(f.coords[0] - ev.coords[0], f.coords[1] - ev.coords[1]) > 2.2)
    .slice(0, 2)
    .map((f) => ({
      coords: f.coords,
      label: f.name,
      sublabel: f.title,
      color: '#B83B3B',
      icon: 'ruler' as AiStoryboardSpotIcon,
    }));

  // Step 2 (if 4 acts): 经济、通道与跨区扩散
  const routeEndpointSpots: AiStoryboardSpot[] = linkedRoutes.slice(0, 2).flatMap((rt) => {
    if (rt.waypoints.length < 2) return [];
    const endCoord = rt.waypoints[rt.waypoints.length - 1];
    if (Math.hypot(endCoord[0] - ev.coords[0], endCoord[1] - ev.coords[1]) < 3) return [];
    return [
      {
        coords: endCoord,
        label: `${rt.name.slice(0, 10)}枢纽`,
        color: rt.color,
        icon: (inferFlowKind(rt) === 'voyage' ? 'port' : 'trade') as AiStoryboardSpotIcon,
      },
    ];
  });

  // Final Step: 文明震荡与连锁后效
  const fallbackNearbyEffects =
    effectEvents.length > 0
      ? effectEvents
      : ALL_EVENTS.filter(
          (cand) =>
            cand.id !== ev.id &&
            cand.year >= ev.year &&
            cand.year <= ev.year + 180 &&
            Math.hypot(cand.coords[0] - ev.coords[0], cand.coords[1] - ev.coords[1]) > 3,
        ).slice(0, 2);

  const effectFlows: AiStoryboardFlow[] = fallbackNearbyEffects.slice(0, 3).map((e) => ({
    from: ev.coords,
    to: e.coords,
    label: e.title.slice(0, 10),
    color: '#8B5CF6',
    kind: 'diffusion',
  }));
  const effectSpots: AiStoryboardSpot[] = [
    {
      coords: ev.coords,
      label: ev.title.slice(0, 12),
      sublabel: '冲击中心',
      color: accent,
      icon: 'landmark',
    },
    ...fallbackNearbyEffects.slice(0, 3).map((e) => ({
      coords: e.coords,
      label: e.title.slice(0, 10),
      sublabel: e.dateDisplay,
      color: '#8B5CF6',
      icon: 'culture' as AiStoryboardSpotIcon,
    })),
  ];

  const count = Math.max(1, beats.length);
  return beats.map((beat, idx) => {
    if (idx === 0) {
      return {
        title: beat.title,
        caption: beat.narration,
        matchSnippet: ev.title,
        year: ev.year,
        center: ev.coords,
        zoom: fallbackNearbyCauses.length > 0 ? Math.max(1.9, baseZoom - 0.85) : baseZoom,
        pitch: 18,
        bearing: -10,
        zones: [
          {
            center: ev.coords,
            radiusKm: 440,
            label: ev.locationName.slice(0, 16),
            color: accent,
          },
        ],
        spots: causeSpots,
        flows: causeFlows,
      };
    }

    if (idx === count - 1) {
      return {
        title: beat.title,
        caption: beat.narration,
        matchSnippet: ev.card.consequence.slice(0, 16),
        year: ev.endYear ?? ev.year,
        center: ev.coords,
        zoom: fallbackNearbyEffects.length > 0 ? Math.max(1.85, baseZoom - 0.9) : Math.max(2.2, baseZoom - 0.35),
        pitch: 20,
        bearing: 12,
        zones: [
          {
            center: ev.coords,
            radiusKm: 760,
            label: '长时段文明辐射圈',
            color: '#8B5CF6',
          },
        ],
        spots: effectSpots,
        flows: effectFlows,
      };
    }

    if (idx === 1) {
      return {
        title: beat.title,
        caption: beat.narration,
        matchSnippet: ev.locationName,
        year: ev.year,
        center: ev.coords,
        zoom: primaryRouteFlows.length > 0 ? Math.max(2.1, baseZoom - 0.65) : Math.min(4.8, baseZoom + 0.65),
        pitch: 26,
        bearing: 12,
        zones: [
          {
            center: ev.coords,
            radiusKm: 300,
            label: '核心权力现场',
            color: '#B83B3B',
          },
        ],
        spots: [
          {
            coords: ev.coords,
            label: ev.title.slice(0, 16),
            sublabel: (ev.card.keyFigures || []).slice(0, 2).join(' · ') || ev.locationName,
            color: '#B83B3B',
            icon: 'ruler',
          },
          ...figureSpots,
        ],
        flows: primaryRouteFlows.length > 0 ? primaryRouteFlows : causeFlows.slice(0, 1),
      };
    }

    return {
      title: beat.title,
      caption: beat.narration,
      matchSnippet: ev.card.economy.slice(0, 16),
      year: ev.endYear ? Math.round((ev.year + ev.endYear) / 2) : ev.year,
      center: ev.coords,
      zoom: linkedRoutes.length > 0 ? Math.max(1.85, baseZoom - 0.95) : baseZoom + 0.1,
      pitch: 22,
      bearing: -6,
      zones: [
        {
          center: ev.coords,
          radiusKm: 560,
          label: `${regionLabel}商贸/传播域`,
          color: '#10B981',
        },
      ],
      spots: [
        {
          coords: ev.coords,
          label: '经济与传播枢纽',
          sublabel: linkedRoutes[0]?.name || regionLabel,
          color: '#10B981',
          icon: 'trade',
        },
        ...routeEndpointSpots,
      ],
      flows: primaryRouteFlows,
    };
  });
}

export function buildRichEventStoryboard(
  ev: HistoryEvent,
  beats: AiDocumentaryBeat[],
): AiStoryboard {
  const safeBeats =
    beats.length > 0 ? beats : [{ title: '历史焦点', narration: ev.card.summary }];
  return {
    title: ev.title,
    steps: buildEventCinemaSteps(ev, safeBeats),
  };
}

function convertEpisodeToDocumentaryPlan(
  episode: StoryEpisode,
  fallback: {
    year: number;
    center: [number, number];
    zoom: number;
    accent: string;
    event?: HistoryEvent | null;
  },
): AiDocumentaryPlan {
  const beats: AiDocumentaryBeat[] = episode.beats.map((b) => ({
    title: b.title,
    narration: b.narration,
  }));
  const fallbackEventSteps = fallback.event
    ? buildEventCinemaSteps(fallback.event, beats)
    : [];

  const steps: AiStoryboardStep[] = episode.beats.map((b, idx) => {
    const baseEvStep = fallbackEventSteps[idx];
    const resolvedCenter = b.center ?? baseEvStep?.center ?? fallback.center;
    return {
      title: `${episode.episodeCode} · ${b.title}`,
      caption: b.narration,
      matchSnippet: b.title,
      year: b.year ?? baseEvStep?.year ?? fallback.year,
      center: resolvedCenter,
      zoom: b.zoom ?? baseEvStep?.zoom ?? fallback.zoom,
      pitch: b.pitch ?? baseEvStep?.pitch ?? (idx % 2 === 0 ? 18 : 22),
      bearing: b.bearing ?? baseEvStep?.bearing ?? (idx % 2 === 0 ? -8 : 8),
      zones: b.zones ?? baseEvStep?.zones ?? [
        {
          center: resolvedCenter,
          radiusKm: 420,
          label: b.title.slice(0, 10),
          color: fallback.accent,
        },
      ],
      spots: b.spots ?? baseEvStep?.spots ?? [
        {
          coords: resolvedCenter,
          label: b.title.slice(0, 10),
          color: fallback.accent,
          icon: 'landmark',
        },
      ],
      flows: b.flows ?? baseEvStep?.flows ?? [],
    };
  });

  return {
    script: beats.map((b) => b.narration).join('\n\n'),
    beats,
    storyboard: {
      title: `${episode.episodeCode} · ${episode.chapterTitle}`,
      steps,
    },
  };
}

export function buildEraBridgePlan(era: Era): AiDocumentaryPlan {
  const curated = getStoryEpisode(era.id);
  if (curated) {
    return convertEpisodeToDocumentaryPlan(curated, {
      year: era.startYear,
      center: [45, 30],
      zoom: 2.3,
      accent: era.accentColor,
    });
  }

  const bridge = ERA_CHRONICLE_BRIDGES[era.id];
  const center = bridge?.focusCoords ?? [42, 28];
  const zoom = bridge?.focusZoom ?? 1.8;
  const startLabel = formatYear(era.startYear);
  const endLabel = formatYear(era.endYear);

  const act1Narration = bridge
    ? `欢迎来到${era.name}，咱们的镜头先拉回${startLabel}到${endLabel}这段风云岁月。很多朋友看历史只看个热闹，可你要是顺着前头的线头摸过来，就会发现局面早就暗流涌动：${ensurePeriod(bridge.transitionFromPrev)}`
    : `欢迎来到${era.name}，从${startLabel}一直讲到${endLabel}。把镜头拉到当年各国博弈的前线：${ensurePeriod(era.overview.geopolitics)}`;

  const act2Narration = bridge
    ? `序幕拉开之后，真正的戏肉在各路势力的拉扯和算盘里。${ensurePeriod(bridge.macroArc)} 表面上看大家整天兵来将往、高喊口号，说白了其实还是兜里的钱粮、商路和赋税推着走：${ensurePeriod(era.overview.economy)}`
    : `政权交锋背后，真正决定胜负的往往是账本：${ensurePeriod(era.overview.economy)} ${ensurePeriod(era.overview.geopolitics)}`;

  const act3Narration = bridge
    ? `别小看人们脑子里的想法，风向一变，整个时代的底色也跟着换了：${ensurePeriod(bridge.foreshadowing)} 而在日常思潮与民间精神深处，${ensurePeriod(era.overview.culture)}`
    : ensurePeriod(era.overview.culture);

  const beats: AiDocumentaryBeat[] = [
    { title: '前因与时代转折', narration: act1Narration },
    { title: '格局与政经引擎', narration: act2Narration },
    { title: '文化脉络与历史伏笔', narration: act3Narration },
  ];

  const eraEvents = ALL_EVENTS.filter((ev) => ev.eraId === era.id);
  const regionalHubs = pickDiverseRegionalEvents(eraEvents, 4);
  const hubSpots: AiStoryboardSpot[] = regionalHubs.map((ev) => ({
    coords: ev.coords,
    label: ev.title.slice(0, 14),
    sublabel: `${REGION_META[ev.region].label} · ${ev.dateDisplay}`,
    color: DIMENSION_META[ev.primaryDimension].color,
    icon: (ev.primaryDimension === 'politics'
      ? 'ruler'
      : ev.primaryDimension === 'economy'
        ? 'trade'
        : ev.primaryDimension === 'tech'
          ? 'port'
          : 'culture') as AiStoryboardSpotIcon,
  }));

  const crossFlows: AiStoryboardFlow[] = [];
  for (let i = 0; i + 1 < regionalHubs.length; i++) {
    crossFlows.push({
      from: regionalHubs[i].coords,
      to: regionalHubs[i + 1].coords,
      label: `${REGION_META[regionalHubs[i].region].label}↔${REGION_META[regionalHubs[i + 1].region].label}`,
      color: era.accentColor,
      kind: i % 2 === 0 ? 'trade' : 'influence',
      bidirectional: true,
    });
  }

  const steps: AiStoryboardStep[] = [
    {
      title: `${era.shortName} · 时代起笔`,
      caption: act1Narration,
      matchSnippet: era.name,
      year: era.startYear,
      center,
      zoom,
      pitch: 14,
      bearing: -8,
      zones: [
        {
          center,
          radiusKm: 1350,
          label: era.name,
          color: era.accentColor,
        },
      ],
      spots:
        hubSpots.length > 0
          ? hubSpots.slice(0, 3)
          : [
              {
                coords: center,
                label: era.name,
                sublabel: `${startLabel} — ${endLabel}`,
                color: era.accentColor,
                icon: 'landmark',
              },
            ],
      flows: crossFlows.slice(0, 2),
    },
    {
      title: `${era.shortName} · 政经主脉`,
      caption: act2Narration,
      matchSnippet: era.shortName,
      year: Math.round((era.startYear + era.endYear) / 2),
      center: regionalHubs[0]?.coords ?? center,
      zoom: Math.max(1.35, zoom - 0.15),
      pitch: 20,
      bearing: 8,
      zones: [
        {
          center: regionalHubs[0]?.coords ?? center,
          radiusKm: 1650,
          label: `${era.shortName}核心联动区`,
          color: era.accentColor,
        },
      ],
      spots: hubSpots,
      flows: crossFlows,
    },
    {
      title: `${era.shortName} · 伏笔与转承`,
      caption: act3Narration,
      matchSnippet: era.shortName,
      year: Math.max(era.startYear, era.endYear - Math.round((era.endYear - era.startYear) * 0.1)),
      center: regionalHubs[regionalHubs.length - 1]?.coords ?? center,
      zoom,
      pitch: 14,
      bearing: -4,
      zones: [
        {
          center,
          radiusKm: 1500,
          label: `${era.shortName}格局重塑`,
          color: '#8B5CF6',
        },
      ],
      spots: hubSpots.slice(-3),
      flows: crossFlows.map((f) => ({ ...f, color: '#8B5CF6', kind: 'diffusion' as const })),
    },
  ];

  return {
    script: beats.map((b) => b.narration).join('\n\n'),
    beats,
    storyboard: {
      title: bridge?.chapterTitle || `${era.name}（${startLabel}—${endLabel}）`,
      steps,
    },
  };
}

export function buildSubPeriodBridgePlan(era: Era, sp: SubPeriod): AiDocumentaryPlan {
  const curated = getStoryEpisode(sp.id);
  if (curated) {
    return convertEpisodeToDocumentaryPlan(curated, {
      year: sp.startYear,
      center: [45, 30],
      zoom: 2.35,
      accent: era.accentColor,
    });
  }

  const chron = SUBPERIOD_CHRONICLE_NARRATIVES[sp.id];
  const eraBridge = ERA_CHRONICLE_BRIDGES[era.id];
  const center = chron?.focusCoords ?? eraBridge?.focusCoords ?? [42, 28];
  const zoom = chron?.focusZoom ?? eraBridge?.focusZoom ?? 1.8;
  const midYear = Math.round((sp.startYear + sp.endYear) / 2);

  const act1 = chron
    ? `接下来翻开${era.shortName}这一章的「${sp.name}」，时间从${formatYear(sp.startYear)}走到${formatYear(sp.endYear)}。好戏开场总得先交待前情，这一段到底是怎么接上前面剧情的呢？${ensurePeriod(chron.bridgeFromBefore)}`
    : `现在翻开「${sp.name}」这一节（${formatYear(sp.startYear)}至${formatYear(sp.endYear)}）。${ensurePeriod(sp.themeSummary)}`;

  const act2 = chron
    ? `咱们把地图拉开看一眼同一时刻的地球东西两端，那真叫一个各有各的热闹：${ensurePeriod(chron.eraCrossSection)}`
    : `同一片天空下，各国正在上演各自的兴衰剧本：${ensurePeriod(era.overview.geopolitics)}`;

  const act3 = chron
    ? `表面上看是城头变幻大王旗，可拨开那层热闹往底下深挖，真正推着历史齿轮咔咔转的底盘在这里：${ensurePeriod(chron.deepDrivers)}`
    : `归根结底，推动这一阶段往前挪步的硬通货还得看这两项：${ensurePeriod(era.overview.economy)} ${ensurePeriod(era.overview.culture)}`;

  const beats: AiDocumentaryBeat[] = [
    { title: '承前启后 · 年代脉络', narration: act1 },
    { title: '同期全球 · 文明联动', narration: act2 },
    { title: '底层动因 · 下一幕伏笔', narration: act3 },
  ];

  const spEvents = ALL_EVENTS.filter(
    (ev) => ev.year >= sp.startYear && ev.year <= sp.endYear,
  );
  const regionalHubs = pickDiverseRegionalEvents(spEvents, 4);
  const spRoutes = HISTORICAL_ROUTES.filter(
    (r) => r.endYear >= sp.startYear && r.startYear <= sp.endYear,
  ).slice(0, 2);

  const hubSpots: AiStoryboardSpot[] = regionalHubs.map((ev) => ({
    coords: ev.coords,
    label: ev.title.slice(0, 14),
    sublabel: `${REGION_META[ev.region].label} · ${ev.dateDisplay}`,
    color: DIMENSION_META[ev.primaryDimension].color,
    icon: (ev.primaryDimension === 'politics'
      ? 'city'
      : ev.primaryDimension === 'economy'
        ? 'trade'
        : 'culture') as AiStoryboardSpotIcon,
  }));

  const routeFlows: AiStoryboardFlow[] = spRoutes.map((rt) => ({
    from: rt.waypoints[0] || center,
    to: rt.waypoints[rt.waypoints.length - 1] || center,
    waypoints: rt.waypoints.length >= 2 ? rt.waypoints : undefined,
    label: rt.name.slice(0, 14),
    color: rt.color,
    kind: inferFlowKind(rt),
    bidirectional: rt.bidirectional,
  }));

  const linkFlows: AiStoryboardFlow[] = [];
  for (let i = 0; i + 1 < regionalHubs.length; i++) {
    linkFlows.push({
      from: regionalHubs[i].coords,
      to: regionalHubs[i + 1].coords,
      label: `同代交汇`,
      color: era.accentColor,
      kind: 'influence',
      bidirectional: true,
    });
  }

  const steps: AiStoryboardStep[] = [
    {
      title: `${sp.name} · 序幕`,
      caption: act1,
      matchSnippet: sp.name,
      year: sp.startYear,
      center,
      zoom,
      pitch: 16,
      bearing: -6,
      zones: [
        {
          center,
          radiusKm: 1200,
          label: sp.name,
          color: era.accentColor,
        },
      ],
      spots:
        hubSpots.length > 0
          ? hubSpots.slice(0, 2)
          : [
              {
                coords: center,
                label: sp.name,
                sublabel: `${formatYear(sp.startYear)} — ${formatYear(sp.endYear)}`,
                color: era.accentColor,
                icon: 'landmark',
              },
            ],
      flows: routeFlows.slice(0, 1),
    },
    {
      title: `${sp.name} · 全球截面`,
      caption: act2,
      matchSnippet: sp.name,
      year: midYear,
      center,
      zoom: Math.max(1.35, zoom - 0.15),
      pitch: 20,
      bearing: 8,
      zones: regionalHubs.slice(0, 2).map((h) => ({
        center: h.coords,
        radiusKm: 620,
        label: REGION_META[h.region].label,
        color: DIMENSION_META[h.primaryDimension].color,
      })),
      spots: hubSpots,
      flows: [...routeFlows, ...linkFlows.slice(0, 2)],
    },
    {
      title: `${sp.name} · 深层张力`,
      caption: act3,
      matchSnippet: sp.name,
      year: sp.endYear,
      center: regionalHubs[regionalHubs.length - 1]?.coords ?? center,
      zoom,
      pitch: 14,
      bearing: -4,
      spots: hubSpots.slice(-3),
      flows: linkFlows.map((f) => ({ ...f, color: '#8B5CF6', kind: 'diffusion' as const })),
    },
  ];

  return {
    script: beats.map((b) => b.narration).join('\n\n'),
    beats,
    storyboard: {
      title: chron?.chapterTitle || `${era.shortName} · ${sp.name}`,
      steps,
    },
  };
}

export function buildDeepEventStoryPlan(
  ev: HistoryEvent,
  era: Era,
  sp: SubPeriod,
): AiDocumentaryPlan {
  const curated = getStoryEpisode(ev.id);
  if (curated) {
    return convertEpisodeToDocumentaryPlan(curated, {
      year: ev.year,
      center: ev.coords,
      zoom: ev.importance === 3 ? 3.2 : 3.55,
      accent: DIMENSION_META[ev.primaryDimension].color,
      event: ev,
    });
  }

  const regionLabel = REGION_META[ev.region].label;
  const causeEvents = (ev.causes || [])
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));
  const effectEvents = (ev.effects || [])
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));
  const linkedRoutes = (ev.routeIds || [])
    .map((id) => ROUTE_MAP[id])
    .filter(Boolean);

  // Act 1: 历史缘起、前因铺垫与地理舞台
  const causeIntro =
    causeEvents.length > 0
      ? `天底下没有平白无故冒出来的历史大戏，它的药引子其实早在${causeEvents
          .map((c) => `${c.dateDisplay}的「${c.title}」`)
          .join('和')}那会儿就已经悄悄埋下了。`
      : '';

  const act1Text = [
    `让我们把镜头直接拉到${ev.dateDisplay}的${regionLabel}${ev.locationName}，这会儿正赶上「${era.shortName} · ${sp.name}」的当口，主角大戏名叫「${ev.title}」。`,
    causeIntro,
    ensurePeriod(ev.card.summary),
    `要弄懂当时的人为啥非走这步棋不可，得先看看他们脚下这片地理舞台：${ensurePeriod(ev.card.geography)}`,
  ]
    .filter(Boolean)
    .join('');

  // Act 2: 权力博弈、制度变革与关键人物
  const figureDetails = (ev.card.keyFigures || [])
    .map((name) => {
      const fig = findFigureByName(name);
      return fig ? `${fig.name}（${fig.title}）` : name;
    })
    .filter(Boolean);
  const figureSentence =
    figureDetails.length > 0
      ? `风口浪尖上，${figureDetails.join('、')}等人粉墨登场，他们手里捏着的牌并不宽裕，每一步落子其实都在刀尖上算计。`
      : '';

  const act2Text = [
    `表面上看各路人物口号喊得震天响，说白了其实都是权位和规矩在重新洗牌：${ensurePeriod(ev.card.politics)}`,
    figureSentence,
  ]
    .filter(Boolean)
    .join('');

  // Act 3: 经济、技术与跨区商贸脉络
  const routeSentence =
    linkedRoutes.length > 0
      ? `人要吃饭、打仗要花银子，顺着「${linkedRoutes.map((r) => r.name).join('」「')}」这几条大动脉，货流跟情报一点也没闲着：${ensurePeriod(
          linkedRoutes[0].description,
        )}`
      : '';

  const act3Text = [
    `往账本最深处扒拉扒拉，支撑整件事翻起大浪的真家伙其实在这里：${ensurePeriod(ev.card.economy)}`,
    routeSentence,
  ]
    .filter(Boolean)
    .join('');

  // Act 4: 文明冲击、长期后果、学术争鸣与后续连锁
  const debateSentence = ev.card.debate
    ? `有意思的是，后世史学家坐在书斋里也没少为这事儿拍桌子争论：${ensurePeriod(ev.card.debate)}`
    : '';
  const effectSentence =
    effectEvents.length > 0
      ? `故事还远没完，今天这一下挥出去的拳头，在之后直接撬动了${effectEvents
          .slice(0, 3)
          .map((e) => `${e.dateDisplay}的「${e.title}」`)
          .join('、')}。`
      : '';

  const act4Text = [
    `这一波折腾下来，老百姓的日常观念与世道人心也悄悄换了副模样：${ensurePeriod(ev.card.culture)}`,
    `等尘埃落定再回头算总账，你会发现它的后劲才刚刚开始显现：${ensurePeriod(ev.card.consequence)}`,
    debateSentence,
    effectSentence,
  ]
    .filter(Boolean)
    .join('');

  const beats: AiDocumentaryBeat[] = [
    { title: '山雨欲来 · 地理舞台', narration: act1Text },
    { title: '权谋交锋 · 关键抉择', narration: act2Text },
    { title: '账本暗流 · 经济推手', narration: act3Text },
    { title: '尘埃落定 · 后世伏笔', narration: act4Text },
  ];

  const steps = buildEventCinemaSteps(ev, beats);

  return {
    script: beats.map((b) => b.narration).join('\n\n'),
    beats,
    storyboard: {
      title: ev.title,
      steps,
    },
  };
}

export function buildDeepFigureStoryPlan(
  fig: HistoricalFigure,
  _era: Era,
): AiDocumentaryPlan {
  const accent = DIMENSION_META[fig.primaryDimension].color;
  const relatedEvents = fig.relatedEventIds
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));

  const act1 = `${fig.lifespanDisplay}，在${REGION_META[fig.region].label}${fig.locationName}，一位名叫${fig.name}的人物正式拎包登上历史舞台，身份是${fig.title}。${ensurePeriod(fig.card.oneLiner)} 要理解他当年的不容易，先看这时代给他发的一手牌：${ensurePeriod(fig.card.eraContext)}`;

  const linkedEventsNote =
    relatedEvents.length > 0
      ? `他这辈子干的几票大事，和${relatedEvents
          .slice(0, 3)
          .map((e) => `${e.dateDisplay}「${e.title}」`)
          .join('、')}紧紧咬在了一起。`
      : '';
  const act2 = `轮到他自己上手破局了，这位狠人是这么出招的：${ensurePeriod(fig.card.coreContributions)} ${linkedEventsNote}`;

  const act3 = `人虽早已不在，可他留下的规矩、作品或者惹出的大风浪过了几百年还在发威：${ensurePeriod(fig.card.historicalImpact)}`;

  const controversyText = fig.card.controversy
    ? `不过评价这么复杂的人物从来不会一边倒，后人对他的功过也是褒贬交锋不断：${ensurePeriod(fig.card.controversy)}`
    : '';
  const quoteText = fig.card.famousQuote
    ? `当年他甩出的那句「${fig.card.famousQuote}」，如今念起来依然能听见那个年代扑面而来的精气神。`
    : '';
  const act4 = [controversyText, quoteText].filter(Boolean).join('');

  const beats: AiDocumentaryBeat[] = [
    { title: '闪亮登场 · 时代手牌', narration: act1 },
    { title: '重手破局 · 关键建树', narration: act2 },
    { title: '百年回响 · 历史余波', narration: act3 },
    ...(act4 ? [{ title: '功过评点 · 金句留痕', narration: act4 }] : []),
  ];

  const steps: AiStoryboardStep[] = beats.map((b, idx) => ({
    title: b.title,
    caption: b.narration,
    matchSnippet: fig.name,
    year: fig.activeYear,
    center: fig.coords,
    zoom: idx === 1 ? 3.8 : idx === 2 ? 2.75 : 3.25,
    pitch: idx === 1 ? 24 : 16,
    bearing: idx % 2 === 0 ? -8 : 10,
    zones: [
      {
        center: fig.coords,
        radiusKm: idx === 2 ? 680 : 340,
        label: fig.locationName,
        color: accent,
      },
    ],
    spots: [
      {
        coords: fig.coords,
        label: fig.name,
        sublabel: fig.title,
        color: accent,
        icon: fig.role === 'ruler' ? 'ruler' : fig.role === 'thinker' ? 'culture' : 'city',
      },
      ...relatedEvents.slice(0, 2).map((re) => ({
        coords: re.coords,
        label: re.title.slice(0, 12),
        sublabel: re.dateDisplay,
        color: '#D97706',
        icon: 'landmark' as AiStoryboardSpotIcon,
      })),
    ],
    flows:
      relatedEvents.length > 0
        ? relatedEvents.slice(0, 3).map((re) => ({
            from: fig.coords,
            to: re.coords,
            label: re.title.slice(0, 14),
            color: accent,
            kind: 'influence' as const,
          }))
        : [],
  }));

  return {
    script: beats.map((b) => b.narration).join('\n\n'),
    beats,
    storyboard: {
      title: `${fig.name} · ${fig.title}`,
      steps,
    },
  };
}
