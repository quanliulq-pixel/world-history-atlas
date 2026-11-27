import {
  ERA_CHRONICLE_BRIDGES,
  SUBPERIOD_CHRONICLE_NARRATIVES,
} from '../data/chronicleChapters';
import { DIMENSION_META, REGION_META } from '../data/eras';
import { EVENT_MAP } from '../data/events';
import { findFigureByName } from '../data/figures';
import { HISTORICAL_ROUTES } from '../data/routes';
import type {
  Era,
  HistoricalFigure,
  HistoryEvent,
  SubPeriod,
} from '../types/history';
import type {
  AiDocumentaryBeat,
  AiDocumentaryPlan,
  AiStoryboardFlow,
  AiStoryboardSpot,
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

  const steps: AiStoryboardStep[] = [
    {
      title: `${era.shortName} · 时代起笔`,
      caption: act1Narration,
      matchSnippet: era.name,
      year: era.startYear,
      center,
      zoom,
      pitch: 14,
      bearing: -6,
      zones: [
        {
          center,
          radiusKm: 1350,
          label: era.name,
          color: era.accentColor,
        },
      ],
      spots: [
        {
          coords: center,
          label: era.name,
          sublabel: `${startLabel} — ${endLabel}`,
          color: era.accentColor,
          icon: 'landmark',
        },
      ],
      flows: [],
    },
    {
      title: `${era.shortName} · 政经主脉`,
      caption: act2Narration,
      matchSnippet: era.shortName,
      year: Math.round((era.startYear + era.endYear) / 2),
      center,
      zoom: Math.max(1.4, zoom - 0.15),
      pitch: 18,
      bearing: 6,
      zones: [
        {
          center,
          radiusKm: 1650,
          label: `${era.shortName}核心圈`,
          color: era.accentColor,
        },
      ],
      spots: [
        {
          coords: center,
          label: `${era.shortName}演进核心`,
          color: era.accentColor,
          icon: 'trade',
        },
      ],
      flows: [],
    },
    {
      title: `${era.shortName} · 伏笔与转承`,
      caption: act3Narration,
      matchSnippet: era.shortName,
      year: Math.max(era.startYear, era.endYear - Math.round((era.endYear - era.startYear) * 0.1)),
      center,
      zoom,
      pitch: 12,
      bearing: 0,
      spots: [
        {
          coords: center,
          label: `${era.shortName}尾声与转向`,
          color: era.accentColor,
          icon: 'culture',
        },
      ],
      flows: [],
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

  const steps: AiStoryboardStep[] = [
    {
      title: `${sp.name} · 序幕`,
      caption: act1,
      matchSnippet: sp.name,
      year: sp.startYear,
      center,
      zoom,
      pitch: 14,
      bearing: -5,
      zones: [
        {
          center,
          radiusKm: 1200,
          label: sp.name,
          color: era.accentColor,
        },
      ],
      spots: [
        {
          coords: center,
          label: sp.name,
          sublabel: `${formatYear(sp.startYear)} — ${formatYear(sp.endYear)}`,
          color: era.accentColor,
          icon: 'landmark',
        },
      ],
      flows: [],
    },
    {
      title: `${sp.name} · 全球截面`,
      caption: act2,
      matchSnippet: sp.name,
      year: midYear,
      center,
      zoom: Math.max(1.4, zoom - 0.15),
      pitch: 18,
      bearing: 6,
      spots: [
        {
          coords: center,
          label: `${sp.name}文明并发带`,
          color: era.accentColor,
          icon: 'culture',
        },
      ],
      flows: [],
    },
    {
      title: `${sp.name} · 深层张力`,
      caption: act3,
      matchSnippet: sp.name,
      year: sp.endYear,
      center,
      zoom,
      pitch: 12,
      bearing: 0,
      spots: [
        {
          coords: center,
          label: `${sp.name}转折点`,
          color: era.accentColor,
          icon: 'trade',
        },
      ],
      flows: [],
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

  // Build synchronized causal map flows & camera shots
  const causeFlows: AiStoryboardFlow[] = causeEvents.slice(0, 3).map((c) => ({
    from: c.coords,
    to: ev.coords,
    label: `前因：${c.title.slice(0, 14)}`,
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
    ...causeEvents.slice(0, 2).map((c) => ({
      coords: c.coords,
      label: `渊源：${c.title.slice(0, 12)}`,
      sublabel: c.dateDisplay,
      color: '#D97706',
      icon: 'city' as const,
    })),
  ];

  const routeFlows: AiStoryboardFlow[] = [];
  if (linkedRoutes.length > 0) {
    const wps = linkedRoutes[0].waypoints;
    if (wps.length >= 2) {
      routeFlows.push({
        from: wps[0],
        to: wps[wps.length - 1],
        label: linkedRoutes[0].name.slice(0, 16),
        color: '#10B981',
        kind: linkedRoutes[0].dimension === 'politics' ? 'military' : 'trade',
        bidirectional: linkedRoutes[0].bidirectional,
      });
    }
  }

  const effectFlows: AiStoryboardFlow[] = effectEvents.slice(0, 3).map((e) => ({
    from: ev.coords,
    to: e.coords,
    label: `后效：${e.title.slice(0, 14)}`,
    color: '#8B5CF6',
    kind: 'diffusion',
  }));
  const effectSpots: AiStoryboardSpot[] = [
    {
      coords: ev.coords,
      label: ev.title.slice(0, 16),
      sublabel: '历史扩散源点',
      color: accent,
      icon: 'landmark',
    },
    ...effectEvents.slice(0, 2).map((e) => ({
      coords: e.coords,
      label: `延伸：${e.title.slice(0, 12)}`,
      sublabel: e.dateDisplay,
      color: '#8B5CF6',
      icon: 'culture' as const,
    })),
  ];

  const baseZoom = ev.importance === 3 ? 3.2 : 3.6;

  const steps: AiStoryboardStep[] = [
    {
      title: '前因与地理舞台',
      caption: act1Text,
      matchSnippet: ev.title,
      year: ev.year,
      center: ev.coords,
      zoom: causeEvents.length > 0 ? Math.max(2.1, baseZoom - 0.8) : baseZoom,
      pitch: 16,
      bearing: -8,
      zones: [
        {
          center: ev.coords,
          radiusKm: 420,
          label: ev.locationName.slice(0, 16),
          color: accent,
        },
      ],
      spots: causeSpots,
      flows: causeFlows,
    },
    {
      title: '权力与制度博弈',
      caption: act2Text,
      matchSnippet: ev.locationName,
      year: ev.year,
      center: ev.coords,
      zoom: Math.min(4.8, baseZoom + 0.65),
      pitch: 24,
      bearing: 10,
      zones: [
        {
          center: ev.coords,
          radiusKm: 280,
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
      ],
      flows: [],
    },
    {
      title: '经济与脉络推手',
      caption: act3Text,
      matchSnippet: ev.card.economy.slice(0, 16),
      year: ev.endYear ? Math.round((ev.year + ev.endYear) / 2) : ev.year,
      center: ev.coords,
      zoom: linkedRoutes.length > 0 ? Math.max(2.0, baseZoom - 0.7) : baseZoom + 0.15,
      pitch: 20,
      bearing: -4,
      spots: [
        {
          coords: ev.coords,
          label: '经济与传播枢纽',
          sublabel: linkedRoutes[0]?.name || regionLabel,
          color: '#10B981',
          icon: 'trade',
        },
      ],
      flows: routeFlows,
    },
    {
      title: '文明震荡与连锁后效',
      caption: act4Text,
      matchSnippet: ev.card.consequence.slice(0, 16),
      year: ev.endYear ?? ev.year,
      center: ev.coords,
      zoom: effectEvents.length > 0 ? Math.max(2.0, baseZoom - 0.85) : baseZoom - 0.25,
      pitch: 18,
      bearing: 12,
      zones: [
        {
          center: ev.coords,
          radiusKm: 720,
          label: '长时段文明回响',
          color: '#8B5CF6',
        },
      ],
      spots: effectSpots,
      flows: effectFlows,
    },
  ];

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
    zoom: idx === 1 ? 4.0 : idx === 2 ? 2.9 : 3.3,
    pitch: idx === 1 ? 22 : 16,
    bearing: idx % 2 === 0 ? -8 : 10,
    zones: [
      {
        center: fig.coords,
        radiusKm: idx === 2 ? 680 : 320,
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
    ],
    flows:
      idx === 1 && relatedEvents.length > 0
        ? relatedEvents.slice(0, 2).map((re) => ({
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
