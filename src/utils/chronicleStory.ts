import {
  ERA_CHRONICLE_BRIDGES,
  SUBPERIOD_CHRONICLE_NARRATIVES,
} from '../data/chronicleChapters';
import { DIMENSION_META, REGION_META } from '../data/eras';
import { ALL_EVENTS, EVENT_MAP } from '../data/events';
import { findFigureByName } from '../data/figures';
import { HISTORICAL_ROUTES } from '../data/routes';
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
    label: causeEvents.includes(c) ? `前因：${c.title.slice(0, 12)}` : `同代背景：${c.title.slice(0, 10)}`,
    color: '#D97706',
    kind: 'influence',
  }));
  const causeSpots: AiStoryboardSpot[] = [
    {
      coords: ev.coords,
      label: ev.locationName.slice(0, 18),
      sublabel: ev.dateDisplay,
      color: accent,
      icon: 'landmark',
    },
    ...fallbackNearbyCauses.slice(0, 3).map((c) => ({
      coords: c.coords,
      label: `${causeEvents.includes(c) ? '渊源' : '同步'}：${c.title.slice(0, 12)}`,
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
    label: effectEvents.includes(e) ? `后效：${e.title.slice(0, 12)}` : `后续：${e.title.slice(0, 10)}`,
    color: '#8B5CF6',
    kind: 'diffusion',
  }));
  const effectSpots: AiStoryboardSpot[] = [
    {
      coords: ev.coords,
      label: ev.title.slice(0, 16),
      sublabel: '冲击扩散中心',
      color: accent,
      icon: 'landmark',
    },
    ...fallbackNearbyEffects.slice(0, 3).map((e) => ({
      coords: e.coords,
      label: `扩散：${e.title.slice(0, 12)}`,
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

export function buildEraBridgePlan(era: Era): AiDocumentaryPlan {
  const bridge = ERA_CHRONICLE_BRIDGES[era.id];
  const center = bridge?.focusCoords ?? [42, 28];
  const zoom = bridge?.focusZoom ?? 1.8;
  const startLabel = formatYear(era.startYear);
  const endLabel = formatYear(era.endYear);

  const act1Narration = bridge
    ? `我们来到${era.name}，时间跨度从${startLabel}到${endLabel}。${ensurePeriod(bridge.transitionFromPrev)}`
    : `进入${era.name}（${startLabel}至${endLabel}）。${ensurePeriod(era.overview.geopolitics)}`;

  const act2Narration = bridge
    ? `${ensurePeriod(bridge.macroArc)} 在这一时期，经济运行的核心逻辑在于：${ensurePeriod(era.overview.economy)}`
    : `${ensurePeriod(era.overview.economy)} ${ensurePeriod(era.overview.geopolitics)}`;

  const act3Narration = bridge
    ? `文化与精神维度上，${ensurePeriod(era.overview.culture)} ${ensurePeriod(bridge.foreshadowing)}`
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
  const chron = SUBPERIOD_CHRONICLE_NARRATIVES[sp.id];
  const eraBridge = ERA_CHRONICLE_BRIDGES[era.id];
  const center = chron?.focusCoords ?? eraBridge?.focusCoords ?? [42, 28];
  const zoom = chron?.focusZoom ?? eraBridge?.focusZoom ?? 1.8;
  const midYear = Math.round((sp.startYear + sp.endYear) / 2);

  const act1 = chron
    ? `现在进入${era.name}的「${sp.name}」阶段（${formatYear(sp.startYear)}至${formatYear(sp.endYear)}）。${ensurePeriod(chron.bridgeFromBefore)}`
    : `进入「${sp.name}」阶段（${formatYear(sp.startYear)}至${formatYear(sp.endYear)}）。${ensurePeriod(sp.themeSummary)}`;

  const act2 = chron
    ? `放眼同期全球横截面：${ensurePeriod(chron.eraCrossSection)}`
    : `宏观地缘脉络：${ensurePeriod(era.overview.geopolitics)}`;

  const act3 = chron
    ? `拨开事件表象，驱动这一时期走向的深层机制在于：${ensurePeriod(chron.deepDrivers)}`
    : `经济与文化推力：${ensurePeriod(era.overview.economy)} ${ensurePeriod(era.overview.culture)}`;

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
      ? `这一变局并非凭空出现，它的前因直接承接自${causeEvents
          .map((c) => `${c.dateDisplay}的「${c.title}」`)
          .join('与')}。`
      : '';

  const act1Text = [
    `${ev.dateDisplay}，处于「${era.name} · ${sp.name}」的${regionLabel}${ev.locationName}，迎来了改写格局的关键时刻——「${ev.title}」。`,
    causeIntro,
    ensurePeriod(ev.card.summary),
    `从地理与空间条件来看，${ensurePeriod(ev.card.geography)}`,
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
      ? `历史现场的推手与核心人物包括${figureDetails.join('、')}，他们在制度约束下做出了关键抉择。`
      : '';

  const act2Text = [
    `回到政治与权力博弈层面：${ensurePeriod(ev.card.politics)}`,
    figureSentence,
  ]
    .filter(Boolean)
    .join('');

  // Act 3: 经济、技术与跨区商贸脉络
  const routeSentence =
    linkedRoutes.length > 0
      ? `依托「${linkedRoutes.map((r) => r.name).join('」「')}」等大动脉，人流、货流与知识持续扩散：${ensurePeriod(
          linkedRoutes[0].description,
        )}`
      : '';

  const act3Text = [
    `在深层的经济与技术脉络上：${ensurePeriod(ev.card.economy)}`,
    routeSentence,
  ]
    .filter(Boolean)
    .join('');

  // Act 4: 文明冲击、长期后果、学术争鸣与后续连锁
  const debateSentence = ev.card.debate
    ? `后世史学界对此也有多元讨论：${ensurePeriod(ev.card.debate)}`
    : '';
  const effectSentence =
    effectEvents.length > 0
      ? `顺着历史的因果链继续往下看，这一转折直接催生或深刻塑造了此后${effectEvents
          .slice(0, 3)
          .map((e) => `${e.dateDisplay}的「${e.title}」`)
          .join('、')}。`
      : '';

  const act4Text = [
    `在文化观念与社会震荡维度：${ensurePeriod(ev.card.culture)}`,
    `从长时段后果回望，${ensurePeriod(ev.card.consequence)}`,
    debateSentence,
    effectSentence,
  ]
    .filter(Boolean)
    .join('');

  const beats: AiDocumentaryBeat[] = [
    { title: '前因与地理舞台', narration: act1Text },
    { title: '权力与制度博弈', narration: act2Text },
    { title: '经济与脉络推手', narration: act3Text },
    { title: '文明震荡与连锁后效', narration: act4Text },
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
  era: Era,
): AiDocumentaryPlan {
  const accent = DIMENSION_META[fig.primaryDimension].color;
  const relatedEvents = fig.relatedEventIds
    .map((id) => EVENT_MAP[id])
    .filter((item): item is HistoryEvent => Boolean(item));

  const act1 = `${fig.lifespanDisplay}，在${REGION_META[fig.region].label}·${fig.locationName}（${era.name}），${fig.name}作为${fig.title}登上历史舞台。${ensurePeriod(fig.card.oneLiner)} ${ensurePeriod(fig.card.eraContext)}`;

  const linkedEventsNote =
    relatedEvents.length > 0
      ? `其人生轨迹与${relatedEvents
          .slice(0, 3)
          .map((e) => `${e.dateDisplay}「${e.title}」`)
          .join('、')}紧密咬合。`
      : '';
  const act2 = `从其核心建树与关键突破来看：${ensurePeriod(fig.card.coreContributions)} ${linkedEventsNote}`;

  const act3 = `从跨越百年的历史回响回望：${ensurePeriod(fig.card.historicalImpact)}`;

  const controversyText = fig.card.controversy
    ? `后世史学与舆论对其亦有深度辨析：${ensurePeriod(fig.card.controversy)}`
    : '';
  const quoteText = fig.card.famousQuote
    ? `流传后世的名言「${fig.card.famousQuote}」，恰似对其时代志向与精神世界的注解。`
    : '';
  const act4 = [controversyText, quoteText].filter(Boolean).join('');

  const beats: AiDocumentaryBeat[] = [
    { title: '时代登场与舞台', narration: act1 },
    { title: '核心建树与抉择', narration: act2 },
    { title: '深远影响与回响', narration: act3 },
    ...(act4 ? [{ title: '多维评述与铭言', narration: act4 }] : []),
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
