import type * as maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiStageBar } from './components/AiStageBar';
import { AiStudioModal, type AiStudioIntent } from './components/AiStudioModal';
import { CausalGraphModal } from './components/CausalGraphModal';
import { ChronicleTicker } from './components/ChronicleTicker';
import { CinemaStageOverlay } from './components/CinemaStageOverlay';
import {
  CountryEvolutionHeader,
  CountryEvolutionPanel,
  CountryMapDock,
} from './components/CountryEvolutionView';
import { EconomicAtlasModal } from './components/EconomicAtlasModal';
import { EventCardPanel } from './components/EventCardPanel';
import { SearchAndProgressModal } from './components/SearchAndProgressModal';
import { TechAtlasModal } from './components/TechAtlasModal';
import { StorylinePickerModal, StorylinePlayerBar } from './components/StorylineOverlay';
import { TimeSwipeOverlay } from './components/TimeSwipeOverlay';
import { TimelineDock } from './components/TimelineDock';
import { TopBar } from './components/TopBar';
import {
  WorldMap,
  type CountryFocusSpec,
  type VisibleEventItem,
  type VisibleFigureItem,
} from './components/WorldMap';
import { WorldPulseModal } from './components/WorldPulseModal';
import {
  COUNTRY_PROFILE_MAP,
  findMatchingStageIndex,
  loadCountryEvolutionIndex,
  resolveCountryEvolution,
  resolveCuratedCountry,
  resolveModernCountry,
} from './data/countries';
import { MAX_YEAR, MIN_YEAR, REGION_META } from './data/eras';
import { ALL_EVENTS, EVENT_MAP } from './data/events';
import { ALL_FIGURES, FIGURE_MAP } from './data/figures';
import { HISTORICAL_ROUTES } from './data/routes';
import { useStudyStore } from './hooks/useStudyStore';
import type {
  ClickedPolityPayload,
  CountryEvolutionIndex,
  Dimension,
  Era,
  HistoricalFigure,
  HistoryEvent,
  ResolvedCountryEvolution,
  SnapshotMeta,
  Storyline,
  SubPeriod,
} from './types/history';
import {
  AiClientError,
  generateDocumentaryPlan,
  getCachedDocumentaryPlan,
  getStoredPasscode,
  getVoicePrefs,
  mapTimelineSpeedToAudioRate,
  playSingleStaticAudio,
  playSpeechChunks,
  playStaticAudioBeats,
  setNarrationPlaybackRate,
  speakWithBrowserSpeech,
  stopActiveNarration,
  subscribeNarrationStop,
  type AiDocumentaryBeat,
  type AiDocumentaryPlan,
  type AiStoryboard,
  type AiStoryboardStep,
  type AiTutorContext,
} from './utils/aiClient';
import { getPreGeneratedAudio, resolveAudioFileUrl } from './utils/mediaAssets';
import { isAmbientEnabled, setAmbientEnabled, setAmbientEra } from './utils/ambientBgm';
import {
  buildDeepEventStoryPlan,
  buildDeepFigureStoryPlan,
  buildEraBridgePlan,
  buildEventCausalContext,
  buildRichEventStoryboard,
  buildSubPeriodBridgePlan,
  getStoredNarrationDepth,
  saveStoredNarrationDepth,
  type NarrationDepth,
} from './utils/chronicleStory';
import {
  resolveNarrationVisualFocus,
  type NarrationFocusMatch,
} from './utils/narrationFocus';
import { buildDocumentarySpeechChunks } from './utils/speechSync';
import {
  loadManifest,
  loadPhysicalAtlas,
  loadSnapshot,
  prefetchAdjacentSnapshots,
  type DecodedSnapshot,
  type PhysicalAtlasData,
} from './utils/snapshotLoader';
import {
  eraProgressToYear,
  eraYearToProgress,
  findAdjacentSnapshot,
  findNearestSnapshot,
  getEraForYear,
  getSubPeriodForYear,
  isEventVisibleAtYear,
  isFigureVisibleAtYear,
  progressToYear,
  yearToProgress,
} from './utils/timeline';

const ALL_DIMENSIONS: Dimension[] = ['politics', 'economy', 'culture', 'tech'];
const PLAY_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function buildLocalFocusStoryboard(
  title: string,
  year: number,
  coords: [number, number],
  beats: Array<{ title: string; narration: string }>,
): AiStoryboard {
  const safeBeats = beats.length > 0 ? beats : [{ title: '历史焦点', narration: title }];
  return {
    title,
    steps: safeBeats.map((beat, idx) => ({
      title: beat.title,
      caption: beat.narration,
      matchSnippet: beat.narration.slice(0, 24),
      year,
      center: coords,
      zoom: idx === 0 ? 3.1 : idx === 1 ? 4.2 : 3.5,
      pitch: idx === 1 ? 24 : 16,
      bearing: idx === 2 ? 12 : idx === 1 ? -8 : 0,
      spots: [
        {
          coords,
          label: idx === 0 ? title : beat.title,
          sublabel: title,
          color: idx === 1 ? '#8C2D2D' : '#B47417',
          icon: idx === 1 ? 'landmark' : 'city',
        },
      ],
      flows: [],
    })),
  };
}

async function playPlanWithFallback(params: {
  cachePrefix: string;
  plan: AiDocumentaryPlan;
  onStartAudio?: (mode: 'gemini' | 'browser') => void;
  onBeatStart?: (beatIdx: number) => void;
  onChunkText?: (speechText: string, beatIdx: number) => void;
}): Promise<'gemini' | 'browser'> {
  const chunks = buildDocumentarySpeechChunks(params.plan.beats);
  const prefs = getVoicePrefs();
  const canTryRemote = prefs.engine !== 'browser' && Boolean(getStoredPasscode());
  let started = false;
  let lastBeat = -1;

  const emitChunk = (chunk: { sceneIndex?: number; speechText?: string }) => {
    const bIdx = chunk.sceneIndex ?? 0;
    if (bIdx !== lastBeat) {
      lastBeat = bIdx;
      params.onBeatStart?.(bIdx);
    }
    if (chunk.speechText) {
      params.onChunkText?.(chunk.speechText, bIdx);
    }
  };

  if (canTryRemote) {
    try {
      await playSpeechChunks({
        cachePrefix: params.cachePrefix,
        chunks,
        voicePrefs: prefs,
        onStartAudio: () => {
          if (started) return;
          started = true;
          params.onStartAudio?.('gemini');
        },
        onChunkStart: emitChunk,
      });
      return 'gemini';
    } catch (err) {
      if (err instanceof AiClientError && err.code === 'aborted') {
        throw err;
      }
      lastBeat = -1;
      started = false;
    }
  }

  await playSpeechChunks({
    cachePrefix: params.cachePrefix,
    chunks,
    voicePrefs: { ...prefs, engine: 'browser' },
    onStartAudio: () => {
      if (started) return;
      started = true;
      params.onStartAudio?.('browser');
    },
    onChunkStart: emitChunk,
  });
  return 'browser';
}

export function App() {
  const {
    theme,
    projection,
    toggleTheme,
    toggleProjection,
  } = useStudyStore();

  const [currentYear, setCurrentYear] = useState<number>(1492);
  const [selectedDimensions, setSelectedDimensions] = useState<Set<Dimension>>(
    () => new Set(ALL_DIMENSIONS),
  );
  const [showAllEras, setShowAllEras] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showFigures, setShowFigures] = useState(true);
  const [showRelief, setShowRelief] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [timelineZoom, setTimelineZoom] = useState<'global' | 'era'>('global');

  const [selectedEventId, setSelectedEventId] = useState<string | null>('e5-columbus');
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(null);
  const [recentTriggerEventId, setRecentTriggerEventId] = useState<string | null>(null);
  const [tickerEventId, setTickerEventId] = useState<string | null>(null);
  const [tickerVisible, setTickerVisible] = useState(false);
  const [sheetState, setSheetState] = useState<'peek' | 'half' | 'full'>(() =>
    window.innerWidth < 1024 ? 'peek' : 'half',
  );
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{
    center: [number, number];
    zoom: number;
    exactZoom?: boolean;
    pitch?: number;
    bearing?: number;
    duration?: number;
    nonce: number;
  } | null>(null);

  const [pulseOpen, setPulseOpen] = useState(false);
  const [economicAtlasOpen, setEconomicAtlasOpen] = useState(false);
  const [techAtlasOpen, setTechAtlasOpen] = useState(false);
  const [storyPickerOpen, setStoryPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [timeSwipeOpen, setTimeSwipeOpen] = useState(false);
  const [causalGraphOpen, setCausalGraphOpen] = useState(false);
  const [mainMapInstance, setMainMapInstance] = useState<maplibregl.Map | null>(null);

  // Gemini AI Studio & Voice Narration state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiIntent, setAiIntent] = useState<AiStudioIntent | null>(null);
  const [aiUnlocked, setAiUnlocked] = useState(() => Boolean(getStoredPasscode()));
  const [cinemaVoiceEnabled, setCinemaVoiceEnabled] = useState(true);
  const [timelineVoiceEnabled, setTimelineVoiceEnabled] = useState(true);
  const [narrationDepth, setNarrationDepth] = useState<NarrationDepth>(() =>
    getStoredNarrationDepth(),
  );
  const [syncCardDuringPlay, setSyncCardDuringPlay] = useState(true);
  const [ambientEnabled, setAmbientEnabledState] = useState(() => isAmbientEnabled());
  const [storyVoiceEnabled, setStoryVoiceEnabled] = useState(true);
  const [tickerNarrationStatus, setTickerNarrationStatus] = useState<
    'idle' | 'loading' | 'playing' | 'browser'
  >('idle');
  const [tickerSpokenText, setTickerSpokenText] = useState<string | null>(null);
  const [tickerBeats, setTickerBeats] = useState<AiDocumentaryBeat[] | null>(null);
  const [tickerActiveBeatIdx, setTickerActiveBeatIdx] = useState(0);
  const [tickerChapterLabel, setTickerChapterLabel] = useState<string | null>(null);
  const [cinemaNarrationStatus, setCinemaNarrationStatus] = useState<
    'idle' | 'loading' | 'playing' | 'browser'
  >('idle');
  const [cinemaSubtitle, setCinemaSubtitle] = useState<string | null>(null);
  const [cinemaBeats, setCinemaBeats] = useState<AiDocumentaryBeat[] | null>(null);
  const [cinemaActiveBeatIdx, setCinemaActiveBeatIdx] = useState(0);
  const [cinemaChapterLabel, setCinemaChapterLabel] = useState<string | null>(null);
  const [cinemaScene, setCinemaScene] = useState<AiStoryboardStep | null>(null);
  const [tickerScene, setTickerScene] = useState<AiStoryboardStep | null>(null);
  const [narrationFocus, setNarrationFocus] = useState<NarrationFocusMatch | null>(null);
  const [cardNarratingId, setCardNarratingId] = useState<string | null>(null);
  const [cardNarrationLoadingId, setCardNarrationLoadingId] = useState<string | null>(null);
  const [cardNarrationSubtitle, setCardNarrationSubtitle] = useState<string | null>(null);
  const [cardNarrationBeats, setCardNarrationBeats] = useState<AiDocumentaryBeat[] | null>(null);
  const [cardActiveBeatIdx, setCardActiveBeatIdx] = useState(0);
  const cardNarrationRunIdRef = useRef(0);
  const cardDocContextRef = useRef<{
    itemId: string;
    cacheKey: string;
    plan: AiDocumentaryPlan;
    staticAudioUrls?: string[];
  } | null>(null);
  const [activeStoryboard, setActiveStoryboard] = useState<AiStoryboard | null>(null);
  const [storyboardStepIdx, setStoryboardStepIdx] = useState(0);
  const [storyboardPlaying, setStoryboardPlaying] = useState(false);
  const [storyboardVoiceSynced, setStoryboardVoiceSynced] = useState(false);

  useEffect(() => {
    return subscribeNarrationStop(() => {
      setStoryboardVoiceSynced(false);
    });
  }, []);

  const [activeStoryline, setActiveStoryline] = useState<Storyline | null>(null);
  const [storyStepIdx, setStoryStepIdx] = useState(0);
  const [storyAutoPlay, setStoryAutoPlay] = useState(false);

  // Country Historical Evolution view state
  const [countryIndex, setCountryIndex] = useState<CountryEvolutionIndex | null>(null);
  const [activeCountry, setActiveCountry] = useState<ResolvedCountryEvolution | null>(null);
  const [countryPlaying, setCountryPlaying] = useState(false);
  const [countryFullReading, setCountryFullReading] = useState(false);
  const [countrySpeed, setCountrySpeed] = useState<number>(1);
  const [countryVoiceEnabled, setCountryVoiceEnabled] = useState(true);
  const [countrySpokenText, setCountrySpokenText] = useState<string | null>(null);
  const [narratingStageId, setNarratingStageId] = useState<string | null>(null);

  // Map geospatial datasets
  const [physical, setPhysical] = useState<PhysicalAtlasData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<DecodedSnapshot | null>(null);
  const activeSnapshotRef = useRef<DecodedSnapshot | null>(null);
  activeSnapshotRef.current = activeSnapshot;
  const lastVisualFocusKeyRef = useRef<string>('');
  const [dataError, setDataError] = useState<string | null>(null);

  const currentEra = useMemo(() => getEraForYear(currentYear), [currentYear]);
  const currentSubPeriod = useMemo(() => getSubPeriodForYear(currentYear), [currentYear]);
  const nearestSnapshotMeta = useMemo(
    () => findNearestSnapshot(currentYear, snapshots),
    [currentYear, snapshots],
  );

  // Load static physical atlas, snapshot manifest, and country evolution index once on mount
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPhysicalAtlas(), loadManifest()])
      .then(([phys, manifest]) => {
        if (cancelled) return;
        setPhysical(phys);
        setSnapshots(manifest);
      })
      .catch((err) => {
        if (!cancelled) setDataError(err instanceof Error ? err.message : '地图数据加载失败');
      });

    loadCountryEvolutionIndex()
      .then((idx) => {
        if (!cancelled) setCountryIndex(idx);
      })
      .catch(() => {
        // Non-blocking fallback handled on demand when clicking a polity
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load current empire boundary snapshot & prefetch adjacent snapshots
  useEffect(() => {
    if (!nearestSnapshotMeta) return;
    let cancelled = false;
    loadSnapshot(nearestSnapshotMeta)
      .then((decoded) => {
        if (!cancelled) setActiveSnapshot(decoded);
      })
      .catch(() => {
        // Retain previous snapshot cleanly on transient network error
      });
    prefetchAdjacentSnapshots(nearestSnapshotMeta, snapshots);
    return () => {
      cancelled = true;
    };
  }, [nearestSnapshotMeta, snapshots]);

  // Filter events by dimensions & compute current-year visibility
  const dimensionFilteredEvents = useMemo(
    () => ALL_EVENTS.filter((ev) => ev.dimensions.some((d) => selectedDimensions.has(d))),
    [selectedDimensions],
  );

  // Live refs for playback & cinema documentary orchestration without restarting mid-animation
  const currentYearRef = useRef(currentYear);
  currentYearRef.current = currentYear;
  const currentEraRef = useRef(currentEra);
  currentEraRef.current = currentEra;
  const playSpeedRef = useRef(playSpeed);
  playSpeedRef.current = playSpeed;
  const cinemaVoiceEnabledRef = useRef(cinemaVoiceEnabled);
  cinemaVoiceEnabledRef.current = cinemaVoiceEnabled;
  const timelineVoiceEnabledRef = useRef(timelineVoiceEnabled);
  timelineVoiceEnabledRef.current = timelineVoiceEnabled;
  const narrationDepthRef = useRef(narrationDepth);
  narrationDepthRef.current = narrationDepth;
  const handleToggleNarrationDepth = useCallback(() => {
    setNarrationDepth((prev) => {
      const next: NarrationDepth = prev === 'story' ? 'concise' : 'story';
      saveStoredNarrationDepth(next);
      return next;
    });
  }, []);
  const syncCardDuringPlayRef = useRef(syncCardDuringPlay);
  syncCardDuringPlayRef.current = syncCardDuringPlay;
  const countrySpeedRef = useRef(countrySpeed);
  countrySpeedRef.current = countrySpeed;
  const countryVoiceEnabledRef = useRef(countryVoiceEnabled);
  countryVoiceEnabledRef.current = countryVoiceEnabled;

  const flyToLocation = useCallback(
    (
      center: [number, number],
      zoom = 3.2,
      opts?: { pitch?: number; bearing?: number; duration?: number; exactZoom?: boolean },
    ) => {
      setFlyTarget({
        center,
        zoom,
        exactZoom: opts?.exactZoom,
        pitch: opts?.pitch ?? 0,
        bearing: opts?.bearing ?? 0,
        duration: opts?.duration ?? 850,
        nonce: Date.now() + Math.random(),
      });
    },
    [],
  );

  const applyLiveNarrationFocus = useCallback(
    (opts: {
      text: string;
      event?: HistoryEvent | null;
      baseStep?: AiStoryboardStep | null;
      targetMode: 'cinema' | 'ticker' | 'card';
      fly?: boolean;
    }) => {
      const focus = resolveNarrationVisualFocus({
        text: opts.text,
        event: opts.event ?? null,
        snapshot: activeSnapshotRef.current,
        fallbackCenter: opts.baseStep?.center,
      });
      setNarrationFocus(focus);

      const base = opts.baseStep ?? null;
      const baseFlows = base?.flows || [];
      const mergedFlows = [...baseFlows];
      for (const fl of focus.interactionFlows) {
        if (!mergedFlows.some((x) => x.label === fl.label)) {
          mergedFlows.push(fl);
        }
      }

      const baseSpots = base?.spots || [];
      const mergedSpots = [...baseSpots];
      for (const mc of focus.matchedCountries) {
        const exists = mergedSpots.some(
          (sp) => Math.hypot(sp.coords[0] - mc.coords[0], sp.coords[1] - mc.coords[1]) < 3,
        );
        if (!exists && mergedSpots.length < 5) {
          mergedSpots.push({
            coords: mc.coords,
            label: mc.label.split(' · ').pop() || mc.label,
            color: mc.color,
            icon: 'city',
          });
        }
      }

      const fallbackCoord = opts.event?.coords ?? focus.cameraCenter ?? [35, 25];
      const enrichedStep: AiStoryboardStep = base
        ? {
            ...base,
            flows: mergedFlows,
            spots: mergedSpots,
          }
        : {
            title: opts.event?.title || focus.concept.label,
            caption: opts.text,
            year: opts.event?.year ?? currentYearRef.current,
            center: focus.cameraCenter ?? fallbackCoord,
            zoom: focus.cameraZoom ?? 2.8,
            pitch: 18,
            bearing: 0,
            zones: focus.matchedCountries.slice(0, 2).map((mc) => ({
              center: mc.coords,
              radiusKm: 620,
              label: mc.label.split(' · ').pop() || mc.label,
              color: mc.color,
            })),
            spots:
              mergedSpots.length > 0
                ? mergedSpots
                : [
                    {
                      coords: fallbackCoord,
                      label: opts.event?.locationName || focus.concept.label,
                      color: focus.concept.color,
                      icon: 'landmark',
                    },
                  ],
            flows: mergedFlows,
          };

      if (opts.targetMode === 'cinema') {
        setCinemaScene(enrichedStep);
      } else if (opts.targetMode === 'ticker') {
        setTickerScene(enrichedStep);
      }

      if (opts.fly !== false && focus.cameraCenter && focus.key !== lastVisualFocusKeyRef.current) {
        lastVisualFocusKeyRef.current = focus.key;
        const useStepCam = Boolean(
          base && base.flows.length > 0 && focus.matchedCountries.length <= 1,
        );
        flyToLocation(
          useStepCam ? base!.center : focus.cameraCenter,
          useStepCam ? base!.zoom : (focus.cameraZoom ?? 2.8),
          {
            exactZoom: true,
            pitch: base?.pitch ?? 20,
            bearing: base?.bearing ?? 0,
            duration: 1050,
          },
        );
      }
    },
    [flyToLocation],
  );

  // Sync Era mood to ambient documentary background audio
  useEffect(() => {
    setAmbientEra(currentEra.id);
  }, [currentEra.id]);

  // Keep playing audio speed synchronized live when user changes playback speed selector
  useEffect(() => {
    setNarrationPlaybackRate(
      mapTimelineSpeedToAudioRate(activeCountry ? countrySpeed : playSpeed),
    );
  }, [playSpeed, countrySpeed, activeCountry]);

  // Auto-clear event shockwave halo outside Cinema Mode holds
  useEffect(() => {
    if (!recentTriggerEventId || cinemaMode) return;
    const timer = window.setTimeout(() => setRecentTriggerEventId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [recentTriggerEventId, cinemaMode]);

  // Smooth chronological playback via requestAnimationFrame with voice-synchronized milestone holds
  useEffect(() => {
    if (!isPlaying || cinemaMode) return;
    let cancelled = false;
    let rafId = 0;
    let resumeTimerId = 0;
    let lastTime = performance.now();
    const scopedEra = timelineZoom === 'era' ? currentEraRef.current : null;
    let progress = scopedEra
      ? eraYearToProgress(currentYearRef.current, scopedEra)
      : yearToProgress(currentYearRef.current);
    let lastCrossYear = currentYearRef.current;
    let lastSpokenEraId = currentEraRef.current.id;
    let lastSpokenSubPeriodId = getSubPeriodForYear(currentYearRef.current).id;
    let lastSpokenEventId: string | null = null;
    let voiceHoldActive = false;

    const triggerTickerNarration = (opts: {
      cacheKey: string;
      fallbackEventKey?: string;
      fallbackScript: string;
      event?: HistoryEvent | null;
    }) => {
      voiceHoldActive = true;
      setTickerChapterLabel(null);
      setTickerBeats(null);
      setTickerSpokenText(opts.fallbackScript);
      const richStep = opts.event
        ? buildRichEventStoryboard(opts.event, [
            { title: opts.event.title, narration: opts.fallbackScript },
          ]).steps[0]
        : null;
      applyLiveNarrationFocus({
        text: opts.fallbackScript,
        event: opts.event ?? null,
        baseStep: richStep,
        targetMode: 'ticker',
        fly: true,
      });
      void (async () => {
        try {
          let entry =
            getVoicePrefs().engine !== 'browser'
              ? await getPreGeneratedAudio(opts.cacheKey)
              : null;
          if (!entry && opts.fallbackEventKey && getVoicePrefs().engine !== 'browser') {
            entry = await getPreGeneratedAudio(opts.fallbackEventKey);
          }
          if (cancelled) return;
          const relFile = entry?.file ?? entry?.beats?.[0]?.file ?? null;
          const script = entry?.beats?.[0]?.narration || entry?.script || opts.fallbackScript;
          setTickerSpokenText(script);
          applyLiveNarrationFocus({
            text: script,
            event: opts.event ?? null,
            baseStep: richStep,
            targetMode: 'ticker',
            fly: true,
          });
          const audioUrl = relFile ? resolveAudioFileUrl(relFile) : null;
          setTickerNarrationStatus(audioUrl ? 'playing' : 'browser');
          const mode = await playSingleStaticAudio({
            audioUrl,
            script,
            playbackRate: mapTimelineSpeedToAudioRate(playSpeedRef.current),
          });
          if (cancelled || mode === 'silent') return;
        } catch {
          // Continue timeline smoothly if audio playback fails
        }
        if (cancelled) return;
        const pauseGapMs = Math.round(280 / Math.max(0.5, playSpeedRef.current));
        resumeTimerId = window.setTimeout(() => {
          if (cancelled) return;
          voiceHoldActive = false;
          setTickerSpokenText(null);
          setTickerScene(null);
          setNarrationFocus(null);
          lastVisualFocusKeyRef.current = '';
          setTickerNarrationStatus('idle');
          lastTime = performance.now();
        }, pauseGapMs);
      })();
    };

    const triggerTickerStorySequence = (
      steps: Array<{
        cacheKey: string;
        chapterLabel: string | null;
        plan: AiDocumentaryPlan;
        eventId?: string | null;
      }>,
    ) => {
      voiceHoldActive = true;
      void (async () => {
        try {
          for (const step of steps) {
            if (cancelled) return;
            if (step.eventId !== undefined) {
              setTickerEventId(step.eventId);
            }
            const evObj = step.eventId ? EVENT_MAP[step.eventId] || null : null;
            setTickerVisible(true);
            setTickerChapterLabel(step.chapterLabel);
            setTickerBeats(step.plan.beats);
            setTickerActiveBeatIdx(0);
            setTickerSpokenText(step.plan.beats[0]?.narration || step.plan.script);
            setTickerNarrationStatus('loading');

            applyLiveNarrationFocus({
              text: step.plan.beats[0]?.narration || step.plan.script,
              event: evObj,
              baseStep: step.plan.storyboard.steps[0] ?? null,
              targetMode: 'ticker',
              fly: true,
            });

            await playPlanWithFallback({
              cachePrefix: step.cacheKey,
              plan: step.plan,
              onStartAudio: (mode) => {
                if (!cancelled) {
                  setTickerNarrationStatus(mode === 'gemini' ? 'playing' : 'browser');
                }
              },
              onBeatStart: (beatIdx) => {
                if (cancelled) return;
                setTickerActiveBeatIdx(beatIdx);
                const beatText = step.plan.beats[beatIdx]?.narration || step.plan.script;
                setTickerSpokenText(beatText);
                applyLiveNarrationFocus({
                  text: beatText,
                  event: evObj,
                  baseStep: step.plan.storyboard.steps[beatIdx] ?? null,
                  targetMode: 'ticker',
                  fly: true,
                });
              },
              onChunkText: (chunkText, beatIdx) => {
                if (cancelled) return;
                applyLiveNarrationFocus({
                  text: chunkText,
                  event: evObj,
                  baseStep: step.plan.storyboard.steps[beatIdx] ?? null,
                  targetMode: 'ticker',
                  fly: true,
                });
              },
            });
          }
        } catch {
          // Ignore interruption or audio failure and resume timeline
        }
        if (cancelled) return;
        const pauseGapMs = Math.round(360 / Math.max(0.5, playSpeedRef.current));
        resumeTimerId = window.setTimeout(() => {
          if (cancelled) return;
          voiceHoldActive = false;
          setTickerSpokenText(null);
          setTickerBeats(null);
          setTickerChapterLabel(null);
          setTickerScene(null);
          setNarrationFocus(null);
          lastVisualFocusKeyRef.current = '';
          setTickerNarrationStatus('idle');
          lastTime = performance.now();
        }, pauseGapMs);
      })();
    };

    if (timelineVoiceEnabledRef.current) {
      const startEra = currentEraRef.current;
      const startSub = getSubPeriodForYear(currentYearRef.current);
      if (narrationDepthRef.current === 'story') {
        triggerTickerStorySequence([
          {
            cacheKey: `story:era:${startEra.id}`,
            chapterLabel: `时代卷首 · ${startEra.name}`,
            plan: buildEraBridgePlan(startEra),
            eventId: null,
          },
          {
            cacheKey: `story:sp:${startSub.id}`,
            chapterLabel: `年代脉络 · ${startSub.name}`,
            plan: buildSubPeriodBridgePlan(startEra, startSub),
            eventId: null,
          },
        ]);
      } else {
        triggerTickerNarration({
          cacheKey: `ticker:era:${startEra.id}`,
          fallbackScript: `进入${startEra.name}。${startEra.overview.geopolitics}`,
        });
      }
    }

    const tick = (now: number) => {
      if (cancelled) return;
      if (!timelineVoiceEnabledRef.current && voiceHoldActive) {
        voiceHoldActive = false;
        setTickerSpokenText(null);
        setTickerBeats(null);
        setTickerChapterLabel(null);
        setTickerNarrationStatus('idle');
      }
      if (voiceHoldActive) {
        lastTime = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const baseDurationSec = scopedEra ? 22 : 62;
      const nextProgress = progress + (dt * playSpeedRef.current) / baseDurationSec;

      if (nextProgress >= 1) {
        const endYear = scopedEra ? scopedEra.endYear : MAX_YEAR;
        setCurrentYear(endYear);
        setIsPlaying(false);
        return;
      }

      progress = nextProgress;
      const nextYear = scopedEra
        ? eraProgressToYear(nextProgress, scopedEra)
        : progressToYear(nextProgress);

      if (nextYear !== lastCrossYear) {
        const isStoryMode = narrationDepthRef.current === 'story';
        const minImportance = isStoryMode
          ? playSpeedRef.current >= 2.5
            ? 3
            : 1
          : playSpeedRef.current >= 2
            ? 3
            : playSpeedRef.current >= 1.5
              ? 2
              : 1;
        let bestCrossed: HistoryEvent | null = null;
        let bestVoiceEvent: HistoryEvent | null = null;
        for (const ev of dimensionFilteredEvents) {
          if (ev.year > lastCrossYear && ev.year <= nextYear) {
            if (!bestCrossed || ev.importance >= bestCrossed.importance) {
              bestCrossed = ev;
            }
            if (
              ev.importance >= minImportance &&
              (!bestVoiceEvent || ev.importance >= bestVoiceEvent.importance)
            ) {
              bestVoiceEvent = ev;
            }
          }
        }
        if (bestCrossed) {
          setRecentTriggerEventId(bestCrossed.id);
          setTickerEventId(bestCrossed.id);
          setTickerVisible(true);
          if (syncCardDuringPlayRef.current) {
            setSelectedFigureId(null);
            setSelectedEventId(bestCrossed.id);
          }
        }

        const nextEra = getEraForYear(nextYear);
        const nextSub = getSubPeriodForYear(nextYear);
        const eraChanged = nextEra.id !== lastSpokenEraId;
        const subChanged = nextSub.id !== lastSpokenSubPeriodId;
        if (eraChanged) lastSpokenEraId = nextEra.id;
        if (subChanged) lastSpokenSubPeriodId = nextSub.id;

        if (timelineVoiceEnabledRef.current && !voiceHoldActive) {
          if (isStoryMode) {
            const seq: Array<{
              cacheKey: string;
              chapterLabel: string | null;
              plan: AiDocumentaryPlan;
              eventId?: string | null;
            }> = [];
            if (eraChanged) {
              seq.push({
                cacheKey: `story:era:${nextEra.id}`,
                chapterLabel: `时代转折 · ${nextEra.name}`,
                plan: buildEraBridgePlan(nextEra),
                eventId: null,
              });
            }
            if (subChanged) {
              seq.push({
                cacheKey: `story:sp:${nextSub.id}`,
                chapterLabel: `年代脉络 · ${nextSub.name}`,
                plan: buildSubPeriodBridgePlan(nextEra, nextSub),
                eventId: null,
              });
            }
            if (bestVoiceEvent && bestVoiceEvent.id !== lastSpokenEventId) {
              lastSpokenEventId = bestVoiceEvent.id;
              seq.push({
                cacheKey: `story:ev:${bestVoiceEvent.id}`,
                chapterLabel: null,
                plan: buildDeepEventStoryPlan(bestVoiceEvent, nextEra, nextSub),
                eventId: bestVoiceEvent.id,
              });
            }
            if (seq.length > 0) {
              triggerTickerStorySequence(seq);
            }
          } else if (bestVoiceEvent && bestVoiceEvent.id !== lastSpokenEventId) {
            lastSpokenEventId = bestVoiceEvent.id;
            triggerTickerNarration({
              cacheKey: `ticker:ev:${bestVoiceEvent.id}`,
              fallbackEventKey: `ev:${bestVoiceEvent.id}`,
              fallbackScript: `${bestVoiceEvent.dateDisplay}，${bestVoiceEvent.title}。${bestVoiceEvent.card.summary}`,
              event: bestVoiceEvent,
            });
          } else if (eraChanged) {
            triggerTickerNarration({
              cacheKey: `ticker:era:${nextEra.id}`,
              fallbackScript: `进入${nextEra.name}。${nextEra.overview.geopolitics}`,
              event: null,
            });
          }
        }

        lastCrossYear = nextYear;
        setCurrentYear(nextYear);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(resumeTimerId);
      stopActiveNarration();
      setTickerSpokenText(null);
      setTickerBeats(null);
      setTickerChapterLabel(null);
      setTickerScene(null);
      setNarrationFocus(null);
      lastVisualFocusKeyRef.current = '';
      setTickerNarrationStatus('idle');
    };
  }, [isPlaying, cinemaMode, timelineZoom, dimensionFilteredEvents, applyLiveNarrationFocus]);

  const visibleEvents = useMemo<VisibleEventItem[]>(() => {
    const items: VisibleEventItem[] = [];
    for (const ev of dimensionFilteredEvents) {
      const vis = isEventVisibleAtYear(ev, currentYear, showAllEras);
      if (vis.visible || ev.id === selectedEventId) {
        items.push({
          event: ev,
          active: vis.active || ev.id === selectedEventId,
          opacity: ev.id === selectedEventId ? 1 : vis.opacity,
        });
      }
    }
    return items;
  }, [dimensionFilteredEvents, currentYear, showAllEras, selectedEventId]);

  const activeWindowEvents = useMemo(
    () => visibleEvents.filter((item) => item.active).map((item) => item.event),
    [visibleEvents],
  );

  const selectedEvent = selectedEventId ? EVENT_MAP[selectedEventId] || null : null;

  // Filter historical figures by dimensions & compute current-year visibility
  const dimensionFilteredFigures = useMemo(
    () => ALL_FIGURES.filter((fig) => fig.dimensions.some((d) => selectedDimensions.has(d))),
    [selectedDimensions],
  );

  const visibleFigures = useMemo<VisibleFigureItem[]>(() => {
    if (!showFigures && !selectedFigureId) return [];
    const items: VisibleFigureItem[] = [];
    for (const fig of dimensionFilteredFigures) {
      const vis = isFigureVisibleAtYear(fig, currentYear, showAllEras);
      if ((showFigures && vis.visible) || fig.id === selectedFigureId) {
        items.push({
          figure: fig,
          active: vis.active || fig.id === selectedFigureId,
          isAlive: vis.isAlive,
          opacity: fig.id === selectedFigureId ? 1 : vis.opacity,
        });
      }
    }
    return items;
  }, [dimensionFilteredFigures, currentYear, showAllEras, showFigures, selectedFigureId]);

  const activeWindowFigures = useMemo(
    () => visibleFigures.filter((item) => item.active).map((item) => item.figure),
    [visibleFigures],
  );

  const selectedFigure = selectedFigureId ? FIGURE_MAP[selectedFigureId] || null : null;

  // Determine active routes (based on currentYear + storyline highlights + selected event)
  const activeRoutes = useMemo(() => {
    if (!showRoutes && !activeStoryline) return [];
    const highlightedIds = new Set<string>(
      activeStoryline?.steps[storyStepIdx]?.highlightRouteIds || [],
    );
    if (focusRouteId) highlightedIds.add(focusRouteId);

    return HISTORICAL_ROUTES.filter((route) => {
      if (highlightedIds.has(route.id)) return true;
      if (!showRoutes) return false;
      const dimMatches = selectedDimensions.has(route.dimension);
      const timeMatches = currentYear >= route.startYear && currentYear <= route.endYear;
      return dimMatches && timeMatches;
    });
  }, [showRoutes, activeStoryline, storyStepIdx, focusRouteId, selectedDimensions, currentYear]);

  // Cinema Documentary Mode: smooth year progression + tilted camera flight + deep/concise choreography
  useEffect(() => {
    if (!cinemaMode) {
      setCinemaNarrationStatus('idle');
      setCinemaSubtitle(null);
      setCinemaBeats(null);
      setCinemaChapterLabel(null);
      setCinemaScene(null);
      return;
    }
    let cancelled = false;
    let rafId = 0;
    let timerId = 0;

    const isStoryMode = narrationDepth === 'story';
    const scopedEra = timelineZoom === 'era' ? currentEraRef.current : null;
    const pool = dimensionFilteredEvents.filter((ev) =>
      scopedEra ? ev.eraId === scopedEra.id : isStoryMode ? true : ev.importance === 3,
    );
    const milestones =
      pool.length >= 2
        ? pool
        : dimensionFilteredEvents.filter((ev) =>
          scopedEra ? ev.eraId === scopedEra.id : ev.importance >= 2,
        );
    if (milestones.length === 0) {
      setCinemaMode(false);
      return;
    }

    let idx = milestones.findIndex((ev) => ev.year >= currentYearRef.current);
    if (idx === -1) idx = 0;

    const animateYearTo = (fromYear: number, toYear: number, durationMs: number) =>
      new Promise<void>((resolve) => {
        if (Math.abs(toYear - fromYear) < 1 || durationMs <= 0) {
          setCurrentYear(toYear);
          resolve();
          return;
        }
        let start: number | null = null;
        const step = (now: number) => {
          if (cancelled) {
            resolve();
            return;
          }
          if (start === null) start = now;
          const rawT = Math.max(0, Math.min(1, (now - start) / durationMs));
          const eased = 1 - Math.pow(1 - rawT, 2);
          setCurrentYear(Math.round(fromYear + (toYear - fromYear) * eased));
          if (rawT < 1) {
            rafId = requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        rafId = requestAnimationFrame(step);
      });

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timerId = window.setTimeout(resolve, ms);
      });

    const playCinemaPlan = async (
      cachePrefix: string,
      plan: AiDocumentaryPlan,
      ev?: HistoryEvent | null,
    ) => {
      setCinemaBeats(plan.beats);
      setCinemaActiveBeatIdx(0);
      const firstText = plan.beats[0]?.narration || plan.script;
      setCinemaSubtitle(firstText);
      applyLiveNarrationFocus({
        text: firstText,
        event: ev ?? null,
        baseStep: plan.storyboard.steps[0] ?? null,
        targetMode: 'cinema',
        fly: true,
      });
      await playPlanWithFallback({
        cachePrefix,
        plan,
        onStartAudio: (mode) => {
          if (!cancelled) {
            setCinemaNarrationStatus(mode === 'gemini' ? 'playing' : 'browser');
          }
        },
        onBeatStart: (beatIdx) => {
          if (cancelled) return;
          setCinemaActiveBeatIdx(beatIdx);
          const beatText = plan.beats[beatIdx]?.narration || plan.script;
          setCinemaSubtitle(beatText);
          const step = plan.storyboard.steps[beatIdx];
          if (step) {
            setCurrentYear(step.year);
          }
          applyLiveNarrationFocus({
            text: beatText,
            event: ev ?? null,
            baseStep: step ?? null,
            targetMode: 'cinema',
            fly: true,
          });
        },
        onChunkText: (chunkText, beatIdx) => {
          if (cancelled) return;
          applyLiveNarrationFocus({
            text: chunkText,
            event: ev ?? null,
            baseStep: plan.storyboard.steps[beatIdx] ?? null,
            targetMode: 'cinema',
            fly: true,
          });
        },
      });
    };

    (async () => {
      let lastBridgeEraId: string | null = null;
      let lastBridgeSubId: string | null = null;

      for (let i = idx; i < milestones.length && !cancelled; i++) {
        const ev = milestones[i];
        const speed = Math.max(0.5, playSpeedRef.current);
        const travelMs = Math.round(1150 / Math.min(2, speed));
        const evEra = getEraForYear(ev.year);
        const evSub = getSubPeriodForYear(ev.year);

        stopActiveNarration();
        setCinemaScene(null);
        setCinemaBeats(null);
        setCinemaChapterLabel(null);
        setCinemaActiveBeatIdx(0);
        setTickerVisible(true);

        if (isStoryMode && cinemaVoiceEnabledRef.current) {
          if (evEra.id !== lastBridgeEraId) {
            lastBridgeEraId = evEra.id;
            const eraBridgePlan = buildEraBridgePlan(evEra);
            setTickerEventId(null);
            setCinemaChapterLabel(`时代卷首 · ${evEra.name}`);
            setCurrentYear(Math.max(evEra.startYear, Math.min(ev.year, currentYearRef.current)));
            try {
              await playCinemaPlan(`story:era:${evEra.id}`, eraBridgePlan);
            } catch {
              // Ignore interruption
            }
            if (cancelled) break;
            setCinemaScene(null);
            await sleep(420);
          }

          if (evSub.id !== lastBridgeSubId && !cancelled) {
            lastBridgeSubId = evSub.id;
            const subBridgePlan = buildSubPeriodBridgePlan(evEra, evSub);
            setTickerEventId(null);
            setCinemaChapterLabel(`年代脉络 · ${evSub.name}`);
            setCurrentYear(Math.max(evSub.startYear, Math.min(ev.year, currentYearRef.current)));
            try {
              await playCinemaPlan(`story:sp:${evSub.id}`, subBridgePlan);
            } catch {
              // Ignore interruption
            }
            if (cancelled) break;
            setCinemaScene(null);
            await sleep(420);
          }
        }

        if (cancelled) break;
        setCinemaChapterLabel(null);
        setSelectedFigureId(null);
        setSelectedEventId(ev.id);
        setFocusRouteId(ev.routeIds?.[0] || null);
        setRecentTriggerEventId(ev.id);
        setTickerVisible(true);
        setTickerEventId(ev.id);

        flyToLocation(ev.coords, ev.importance === 3 ? 3.25 : 3.55, {
          pitch: 18,
          bearing: 0,
          duration: travelMs,
        });

        const docPromise = cinemaVoiceEnabledRef.current
          ? (async () => {
              if (isStoryMode) {
                const localPlan = buildDeepEventStoryPlan(ev, evEra, evSub);
                if (getVoicePrefs().engine !== 'browser' && Boolean(getStoredPasscode())) {
                  try {
                    setCinemaNarrationStatus('loading');
                    setCinemaSubtitle(`${ev.title} — 正在撰写长篇听书脚本并编排因果地图动画...`);
                    const causal = buildEventCausalContext(ev);
                    const aiPlan = await generateDocumentaryPlan({
                      cacheKey: `ev:${ev.id}:story`,
                      depth: 'story',
                      title: ev.title,
                      year: ev.year,
                      yearDisplay: ev.dateDisplay,
                      coords: ev.coords,
                      eraName: evEra.name,
                      subPeriodName: evSub.name,
                      regionLabel: REGION_META[ev.region].label,
                      summary: ev.card.summary,
                      geography: ev.card.geography,
                      politics: ev.card.politics,
                      economy: ev.card.economy,
                      culture: ev.card.culture,
                      consequence: ev.card.consequence,
                      causesText: causal.causesText,
                      effectsText: causal.effectsText,
                      keyFiguresText: causal.keyFiguresText,
                      debate: ev.card.debate,
                    });
                    return { plan: aiPlan, staticAudioUrls: undefined };
                  } catch {
                    return { plan: localPlan, staticAudioUrls: undefined };
                  }
                }
                return { plan: localPlan, staticAudioUrls: undefined };
              }

              const staticEntry =
                getVoicePrefs().engine !== 'browser'
                  ? await getPreGeneratedAudio(`ev:${ev.id}`)
                  : null;
              if (staticEntry?.beats?.length) {
                const cachedPlan = getCachedDocumentaryPlan(`ev:${ev.id}`);
                const beats = staticEntry.beats.map((b) => ({
                  title: b.title,
                  narration: b.narration,
                }));
                const plan: AiDocumentaryPlan = cachedPlan ?? {
                  script: staticEntry.script,
                  beats,
                  storyboard: buildRichEventStoryboard(ev, beats),
                };
                return {
                  plan,
                  staticAudioUrls: staticEntry.beats.map((b) => resolveAudioFileUrl(b.file)),
                };
              }
              setCinemaNarrationStatus('loading');
              setCinemaSubtitle(`${ev.title} — 正在撰写纪录片脚本并编排地图动画...`);
              try {
                const plan = await generateDocumentaryPlan({
                  cacheKey: `ev:${ev.id}:concise`,
                  depth: 'concise',
                  title: ev.title,
                  year: ev.year,
                  yearDisplay: ev.dateDisplay,
                  coords: ev.coords,
                  eraName: evEra.name,
                  subPeriodName: evSub.name,
                  regionLabel: REGION_META[ev.region].label,
                  summary: ev.card.summary,
                  geography: ev.card.geography,
                  politics: ev.card.politics,
                  economy: ev.card.economy,
                  culture: ev.card.culture,
                  consequence: ev.card.consequence,
                });
                return { plan, staticAudioUrls: undefined };
              } catch {
                return {
                  fallbackText: `${ev.dateDisplay}，${ev.title}。${ev.card.summary}`,
                };
              }
            })()
          : null;

        await animateYearTo(currentYearRef.current, ev.year, travelMs);
        if (cancelled) break;

        if (cinemaVoiceEnabledRef.current && docPromise) {
          const result = await docPromise;
          if (cancelled) break;
          if ('fallbackText' in result && result.fallbackText) {
            const fallbackText = result.fallbackText;
            setCinemaBeats(null);
            setCinemaSubtitle(fallbackText);
            setCinemaNarrationStatus('browser');
            await speakWithBrowserSpeech(fallbackText);
          } else if ('plan' in result && result.plan) {
            const { plan, staticAudioUrls } = result;
            if (staticAudioUrls && staticAudioUrls.length === plan.beats.length) {
              setCinemaBeats(plan.beats);
              setCinemaActiveBeatIdx(0);
              setCinemaSubtitle(plan.script);
              try {
                await playStaticAudioBeats({
                  beats: plan.beats.map((b, beatIdx) => ({
                    audioUrl: staticAudioUrls[beatIdx],
                    narration: b.narration,
                  })),
                  onStartAudio: () => {
                    if (!cancelled) setCinemaNarrationStatus('playing');
                  },
                  onBeatStart: (beatIdx) => {
                    if (cancelled) return;
                    setCinemaActiveBeatIdx(beatIdx);
                    const step = plan.storyboard.steps[beatIdx];
                    if (step) {
                      setCurrentYear(step.year);
                    }
                    applyLiveNarrationFocus({
                      text: plan.beats[beatIdx]?.narration || plan.script,
                      event: ev,
                      baseStep: step ?? null,
                      targetMode: 'cinema',
                      fly: true,
                    });
                  },
                });
              } catch {
                if (!cancelled) {
                  await playCinemaPlan(`story:ev:${ev.id}`, plan, ev);
                }
              }
            } else {
              await playCinemaPlan(`${isStoryMode ? 'story' : 'doc'}:ev:${ev.id}`, plan, ev);
            }
          }
          if (cancelled) break;
          setCinemaScene(null);
          setCinemaBeats(null);
          setCinemaChapterLabel(null);
          setNarrationFocus(null);
          lastVisualFocusKeyRef.current = '';
          await sleep(650);
        } else {
          setCinemaNarrationStatus('idle');
          setCinemaSubtitle(null);
          const holdMs = Math.max(1400, Math.round(3500 / speed));
          await sleep(holdMs);
        }
      }

      if (!cancelled) {
        stopActiveNarration();
        setCinemaNarrationStatus('idle');
        setCinemaSubtitle(null);
        setCinemaBeats(null);
        setCinemaChapterLabel(null);
        setCinemaScene(null);
        setNarrationFocus(null);
        lastVisualFocusKeyRef.current = '';
        setCinemaMode(false);
        setRecentTriggerEventId(null);
        const lastEv = milestones[milestones.length - 1];
        if (lastEv) {
          flyToLocation(lastEv.coords, 2.8, { pitch: 0, bearing: 0, duration: 750 });
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      stopActiveNarration();
      setCinemaNarrationStatus('idle');
      setCinemaScene(null);
      setCinemaBeats(null);
      setCinemaChapterLabel(null);
      setNarrationFocus(null);
      lastVisualFocusKeyRef.current = '';
    };
  }, [cinemaMode, timelineZoom, narrationDepth, dimensionFilteredEvents, flyToLocation, applyLiveNarrationFocus]);

  const stopAiNarrationAndStage = useCallback((clearStage = true, closeStudio = false) => {
    cardNarrationRunIdRef.current += 1;
    cardDocContextRef.current = null;
    stopActiveNarration();
    setCardNarratingId(null);
    setCardNarrationLoadingId(null);
    setCardNarrationSubtitle(null);
    setCardNarrationBeats(null);
    setCinemaBeats(null);
    setCinemaScene(null);
    setTickerScene(null);
    setNarrationFocus(null);
    lastVisualFocusKeyRef.current = '';
    setStoryboardVoiceSynced(false);
    if (clearStage) {
      setStoryboardPlaying(false);
      setActiveStoryboard(null);
    }
    if (closeStudio) {
      setAiOpen((wasOpen) => {
        if (wasOpen) {
          setDesktopCollapsed(false);
        }
        return false;
      });
    }
  }, []);

  const applyYearChange = useCallback(
    (yr: number) => {
      stopAiNarrationAndStage(true, true);
      setIsPlaying(false);
      setCinemaMode(false);
      const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, yr));
      setCurrentYear(clamped);
      if (selectedEventId) {
        const ev = EVENT_MAP[selectedEventId];
        if (!ev || !isEventVisibleAtYear(ev, clamped, false).active) {
          setSelectedEventId(null);
          setFocusRouteId(null);
        }
      }
      if (selectedFigureId) {
        const fig = FIGURE_MAP[selectedFigureId];
        if (!fig || !isFigureVisibleAtYear(fig, clamped, false).active) {
          setSelectedFigureId(null);
        }
      }
    },
    [selectedEventId, selectedFigureId, stopAiNarrationAndStage],
  );

  const handleSelectEra = useCallback(
    (era: Era) => {
      const targetYear =
        era.id === 'era-1'
          ? -2500
          : Math.round(era.startYear + (era.endYear - era.startYear) * 0.2);
      applyYearChange(targetYear);
      const isGlobalEra =
        era.id === 'era-5' || era.id === 'era-6' || era.id === 'era-7' || era.id === 'era-8';
      flyToLocation(
        isGlobalEra ? [22, 20] : [54, 26],
        isGlobalEra
          ? window.innerWidth < 640
            ? 1.2
            : 1.55
          : window.innerWidth < 640
            ? 1.45
            : 1.95,
        { exactZoom: true, pitch: 0, duration: 750 },
      );
    },
    [applyYearChange, flyToLocation],
  );

  const handleStepSnapshot = useCallback(
    (direction: -1 | 1) => {
      const snap = findAdjacentSnapshot(currentYear, snapshots, direction);
      if (!snap) return;
      applyYearChange(snap.year);
      setTickerEventId(null);
      setTickerVisible(true);
    },
    [currentYear, snapshots, applyYearChange],
  );

  const handleSelectEvent = useCallback(
    (ev: HistoryEvent, fromStoryline = false) => {
      stopAiNarrationAndStage(true, true);
      setIsPlaying(false);
      setCinemaMode(false);
      setSelectedFigureId(null);
      setSelectedEventId(ev.id);
      setCurrentYear(ev.year);
      setFocusRouteId(ev.routeIds?.[0] || null);
      setRecentTriggerEventId(ev.id);
      if (!fromStoryline) {
        setDesktopCollapsed(false);
        if (window.innerWidth < 1024) {
          setSheetState('half');
        }
      }
      flyToLocation(ev.coords, ev.importance === 3 ? 3.2 : 3.6);
    },
    [flyToLocation, stopAiNarrationAndStage],
  );

  const handleSelectFigure = useCallback(
    (fig: HistoricalFigure) => {
      stopAiNarrationAndStage(true, true);
      setIsPlaying(false);
      setCinemaMode(false);
      setSelectedEventId(null);
      setFocusRouteId(null);
      setRecentTriggerEventId(null);
      setSelectedFigureId(fig.id);
      setCurrentYear(fig.activeYear);
      setDesktopCollapsed(false);
      if (window.innerWidth < 1024) {
        setSheetState('half');
      }
      flyToLocation(fig.coords, fig.importance === 3 ? 3.2 : 3.5);
    },
    [flyToLocation, stopAiNarrationAndStage],
  );

  const applyStoryStep = useCallback(
    (sl: Storyline, idx: number) => {
      const step = sl.steps[idx];
      if (!step) return;
      const ev = EVENT_MAP[step.eventId];
      if (!ev) return;
      stopAiNarrationAndStage(true, true);
      setIsPlaying(false);
      setCinemaMode(false);
      setStoryStepIdx(idx);
      setSelectedFigureId(null);
      setSelectedEventId(ev.id);
      setCurrentYear(ev.year);
      setFocusRouteId(step.highlightRouteIds?.[0] || ev.routeIds?.[0] || null);
      setRecentTriggerEventId(ev.id);
      flyToLocation(step.center || ev.coords, step.zoom || 3.4);
    },
    [flyToLocation, stopAiNarrationAndStage],
  );

  // Storyline voice narration & optional auto-advance
  useEffect(() => {
    if (!activeStoryline) return;
    const step = activeStoryline.steps[storyStepIdx];
    const ev = step ? EVENT_MAP[step.eventId] : null;
    if (!step || !ev) return;

    let cancelled = false;
    let timerId = 0;

    if (storyVoiceEnabled) {
      void (async () => {
        try {
          const entry =
            getVoicePrefs().engine !== 'browser'
              ? await getPreGeneratedAudio(`story:${activeStoryline.id}:${storyStepIdx}`)
              : null;
          if (cancelled) return;
          const script = entry?.script || `${ev.dateDisplay}，${ev.title}。${step.narrative}`;
          const audioUrl = entry?.file ? resolveAudioFileUrl(entry.file) : null;
          const mode = await playSingleStaticAudio({
            audioUrl,
            script,
            playbackRate: mapTimelineSpeedToAudioRate(playSpeedRef.current),
          });
          if (cancelled || mode === 'silent') return;
        } catch {
          // Ignore interruption
        }
        if (cancelled || !storyAutoPlay) return;
        timerId = window.setTimeout(() => {
          if (cancelled) return;
          setStoryStepIdx((prev) => {
            const next = prev + 1;
            if (next >= activeStoryline.steps.length) {
              setStoryAutoPlay(false);
              return prev;
            }
            const nextStep = activeStoryline.steps[next];
            const nextEv = nextStep ? EVENT_MAP[nextStep.eventId] : null;
            if (nextEv) {
              setSelectedFigureId(null);
              setSelectedEventId(nextEv.id);
              setCurrentYear(nextEv.year);
              setFocusRouteId(nextStep.highlightRouteIds?.[0] || nextEv.routeIds?.[0] || null);
              setRecentTriggerEventId(nextEv.id);
              flyToLocation(nextStep.center || nextEv.coords, nextStep.zoom || 3.4);
            }
            return next;
          });
        }, 650);
      })();

      return () => {
        cancelled = true;
        window.clearTimeout(timerId);
        stopActiveNarration();
      };
    }

    if (!storyAutoPlay) return;
    const timer = window.setInterval(() => {
      setStoryStepIdx((prev) => {
        const next = prev + 1;
        if (next >= activeStoryline.steps.length) {
          setStoryAutoPlay(false);
          return prev;
        }
        const nextStep = activeStoryline.steps[next];
        const nextEv = nextStep ? EVENT_MAP[nextStep.eventId] : null;
        if (nextEv) {
          setSelectedFigureId(null);
          setSelectedEventId(nextEv.id);
          setCurrentYear(nextEv.year);
          setFocusRouteId(nextStep.highlightRouteIds?.[0] || nextEv.routeIds?.[0] || null);
          flyToLocation(nextStep.center || nextEv.coords, nextStep.zoom || 3.4);
        }
        return next;
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeStoryline, storyStepIdx, storyAutoPlay, storyVoiceEnabled, flyToLocation]);

  const handleToggleDimension = useCallback((dim: Dimension | 'all') => {
    if (dim === 'all') {
      setSelectedDimensions(new Set(ALL_DIMENSIONS));
      return;
    }
    setSelectedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) {
        if (next.size === 1) return new Set(ALL_DIMENSIONS);
        next.delete(dim);
      } else {
        next.add(dim);
      }
      return next;
    });
  }, []);

  const handleStepMilestone = useCallback(
    (direction: -1 | 1) => {
      setIsPlaying(false);
      const list = dimensionFilteredEvents;
      if (list.length === 0) return;

      if (selectedEvent) {
        const idx = list.findIndex((e) => e.id === selectedEvent.id);
        if (idx !== -1) {
          const nextIdx = Math.max(0, Math.min(list.length - 1, idx + direction));
          handleSelectEvent(list[nextIdx]);
          return;
        }
      }

      const candidate =
        direction === 1
          ? list.find((e) => e.year > currentYear) || list[list.length - 1]
          : [...list].reverse().find((e) => e.year < currentYear) || list[0];
      if (candidate) handleSelectEvent(candidate);
    },
    [dimensionFilteredEvents, selectedEvent, currentYear, handleSelectEvent],
  );

  const tickerEvent = tickerEventId ? EVENT_MAP[tickerEventId] || null : null;

  const aiContext = useMemo<AiTutorContext>(() => {
    return {
      currentYear,
      eraName: currentEra.name,
      subPeriodName: currentSubPeriod.name,
      event: selectedEvent
        ? {
          title: selectedEvent.title,
          dateDisplay: selectedEvent.dateDisplay,
          locationName: selectedEvent.locationName,
          summary: selectedEvent.card.summary,
          politics: selectedEvent.card.politics,
          economy: selectedEvent.card.economy,
          culture: selectedEvent.card.culture,
          consequence: selectedEvent.card.consequence,
        }
        : null,
      figure: selectedFigure
        ? {
          name: selectedFigure.name,
          title: selectedFigure.title,
          lifespanDisplay: selectedFigure.lifespanDisplay,
          oneLiner: selectedFigure.card.oneLiner,
          coreContributions: selectedFigure.card.coreContributions,
          historicalImpact: selectedFigure.card.historicalImpact,
        }
        : null,
      country: activeCountry
        ? {
          name: activeCountry.name,
          tagline: activeCountry.tagline,
          geography: activeCountry.overview.geography,
          politics: activeCountry.overview.politics,
          economy: activeCountry.overview.economy,
          culture: activeCountry.overview.culture,
        }
        : null,
    };
  }, [currentYear, currentEra, currentSubPeriod, selectedEvent, selectedFigure, activeCountry]);

  const openAiWithIntent = useCallback((partial: Omit<AiStudioIntent, 'nonce'>) => {
    setAiIntent({ ...partial, nonce: Date.now() + Math.random() });
    setAiOpen(true);
  }, []);

  const handlePlayStoryboard = useCallback((sb: AiStoryboard) => {
    setIsPlaying(false);
    setCinemaMode(false);
    setActiveStoryline(null);
    setStoryAutoPlay(false);
    setTickerVisible(false);
    setActiveStoryboard(sb);
    setStoryboardStepIdx(0);
    setStoryboardVoiceSynced(false);
    setStoryboardPlaying(true);
  }, []);

  const handleSyncStoryboardStep = useCallback(
    (sb: AiStoryboard, stepIdx: number, voiceSynced: boolean) => {
      setIsPlaying(false);
      setCinemaMode(false);
      setActiveStoryline(null);
      setStoryAutoPlay(false);
      setTickerVisible(false);
      setActiveStoryboard((cur) => (cur === sb ? cur : sb));
      const clamped = Math.max(0, Math.min(sb.steps.length - 1, stepIdx));
      setStoryboardStepIdx(clamped);
      if (voiceSynced) {
        setStoryboardPlaying(false);
      }
      setStoryboardVoiceSynced(voiceSynced);
    },
    [],
  );

  // Sync map year & camera flight whenever the active AI storyboard scene changes
  useEffect(() => {
    if (!activeStoryboard || activeCountry) return;
    const step = activeStoryboard.steps[storyboardStepIdx];
    if (!step) return;
    setCurrentYear(step.year);
    flyToLocation(step.center, step.zoom, {
      exactZoom: true,
      pitch: step.pitch ?? 20,
      bearing: step.bearing ?? 0,
      duration: 1050,
    });
  }, [activeStoryboard, storyboardStepIdx, activeCountry, flyToLocation]);

  // Auto-advance AI storyboard scenes cleanly
  useEffect(() => {
    if (!activeStoryboard || !storyboardPlaying || activeCountry) return;
    const timer = window.setInterval(() => {
      setStoryboardStepIdx((prev) => {
        if (prev + 1 >= activeStoryboard.steps.length) {
          setStoryboardPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [activeStoryboard, storyboardPlaying, activeCountry]);

  const handleStopCardNarration = useCallback(() => {
    cardNarrationRunIdRef.current += 1;
    cardDocContextRef.current = null;
    stopActiveNarration();
    setCardNarratingId(null);
    setCardNarrationLoadingId(null);
    setCardNarrationSubtitle(null);
    setCardNarrationBeats(null);
    setNarrationFocus(null);
    lastVisualFocusKeyRef.current = '';
    setStoryboardVoiceSynced(false);
  }, []);

  const runCardDocumentaryNarration = useCallback(
    async (params: {
      itemId: string;
      cacheKey: string;
      title: string;
      year: number;
      yearDisplay: string;
      coords: [number, number];
      eraName?: string;
      subPeriodName?: string;
      regionLabel?: string;
      summary: string;
      geography?: string;
      politics?: string;
      economy?: string;
      culture?: string;
      consequence?: string;
      causesText?: string;
      effectsText?: string;
      keyFiguresText?: string;
      debate?: string;
      localStoryPlan?: AiDocumentaryPlan;
      skipRemote?: boolean;
      loadingMessage: string;
      fallbackText: string;
    }) => {
      const runId = ++cardNarrationRunIdRef.current;
      const isStoryMode = narrationDepthRef.current === 'story';
      setCinemaMode(false);
      stopActiveNarration();
      setCardNarrationLoadingId(params.itemId);
      setCardNarratingId(params.itemId);
      setCardNarrationBeats(null);
      setCardActiveBeatIdx(0);
      setCardNarrationSubtitle(params.loadingMessage);
      try {
        if (isStoryMode && params.localStoryPlan) {
          let plan = params.localStoryPlan;
          if (
            !params.skipRemote &&
            getVoicePrefs().engine !== 'browser' &&
            Boolean(getStoredPasscode())
          ) {
            try {
              plan = await generateDocumentaryPlan({
                cacheKey: `${params.cacheKey}:story`,
                depth: 'story',
                title: params.title,
                year: params.year,
                yearDisplay: params.yearDisplay,
                coords: params.coords,
                eraName: params.eraName,
                subPeriodName: params.subPeriodName,
                regionLabel: params.regionLabel,
                summary: params.summary,
                geography: params.geography,
                politics: params.politics,
                economy: params.economy,
                culture: params.culture,
                consequence: params.consequence,
                causesText: params.causesText,
                effectsText: params.effectsText,
                keyFiguresText: params.keyFiguresText,
                debate: params.debate,
              });
            } catch {
              plan = params.localStoryPlan;
            }
          }
          if (cardNarrationRunIdRef.current !== runId) return;

          cardDocContextRef.current = {
            itemId: params.itemId,
            cacheKey: `${params.cacheKey}:story`,
            plan,
          };
          setCardNarrationBeats(plan.beats);
          setCardActiveBeatIdx(0);
          setCardNarrationSubtitle(plan.script);
          setActiveStoryboard(plan.storyboard);
          setStoryboardStepIdx(0);
          setStoryboardPlaying(false);
          setStoryboardVoiceSynced(true);

          await playPlanWithFallback({
            cachePrefix: `story:${params.cacheKey}`,
            plan,
            onStartAudio: () => {
              if (cardNarrationRunIdRef.current === runId) {
                setCardNarrationLoadingId(null);
              }
            },
            onBeatStart: (beatIdx) => {
              if (cardNarrationRunIdRef.current !== runId) return;
              setCardActiveBeatIdx(beatIdx);
              setStoryboardStepIdx(beatIdx);
              applyLiveNarrationFocus({
                text: plan.beats[beatIdx]?.narration || plan.script,
                event: EVENT_MAP[params.itemId] ?? null,
                baseStep: plan.storyboard.steps[beatIdx] ?? null,
                targetMode: 'card',
                fly: true,
              });
            },
          });
          return;
        }

        const staticEntry =
          getVoicePrefs().engine !== 'browser'
            ? await getPreGeneratedAudio(params.cacheKey)
            : null;
        if (cardNarrationRunIdRef.current !== runId) return;

        if (staticEntry?.beats?.length) {
          const cachedPlan = getCachedDocumentaryPlan(params.cacheKey);
          const beats = staticEntry.beats.map((b) => ({
            title: b.title,
            narration: b.narration,
          }));
          const matchedEv = params.cacheKey.startsWith('ev:') ? EVENT_MAP[params.itemId] : undefined;
          const plan: AiDocumentaryPlan = cachedPlan ?? {
            script: staticEntry.script,
            beats,
            storyboard: matchedEv
              ? buildRichEventStoryboard(matchedEv, beats)
              : buildLocalFocusStoryboard(params.title, params.year, params.coords, beats),
          };
          const staticAudioUrls = staticEntry.beats.map((b) => resolveAudioFileUrl(b.file));
          cardDocContextRef.current = {
            itemId: params.itemId,
            cacheKey: params.cacheKey,
            plan,
            staticAudioUrls,
          };
          setCardNarrationBeats(plan.beats);
          setCardActiveBeatIdx(0);
          setCardNarrationSubtitle(plan.script);
          setActiveStoryboard(plan.storyboard);
          setStoryboardStepIdx(0);
          setStoryboardPlaying(false);
          setStoryboardVoiceSynced(true);

          await playStaticAudioBeats({
            beats: plan.beats.map((b, idx) => ({
              audioUrl: staticAudioUrls[idx],
              narration: b.narration,
            })),
            onStartAudio: () => {
              if (cardNarrationRunIdRef.current === runId) {
                setCardNarrationLoadingId(null);
              }
            },
            onBeatStart: (beatIdx) => {
              if (cardNarrationRunIdRef.current !== runId) return;
              setCardActiveBeatIdx(beatIdx);
              setStoryboardStepIdx(beatIdx);
              applyLiveNarrationFocus({
                text: plan.beats[beatIdx]?.narration || plan.script,
                event: EVENT_MAP[params.itemId] ?? null,
                baseStep: plan.storyboard.steps[beatIdx] ?? null,
                targetMode: 'card',
                fly: true,
              });
            },
          });
          return;
        }

        const plan = await generateDocumentaryPlan({
          cacheKey: `${params.cacheKey}:concise`,
          depth: 'concise',
          title: params.title,
          year: params.year,
          yearDisplay: params.yearDisplay,
          coords: params.coords,
          eraName: params.eraName,
          subPeriodName: params.subPeriodName,
          regionLabel: params.regionLabel,
          summary: params.summary,
          geography: params.geography,
          politics: params.politics,
          economy: params.economy,
          culture: params.culture,
          consequence: params.consequence,
        });
        if (cardNarrationRunIdRef.current !== runId) return;
        cardDocContextRef.current = {
          itemId: params.itemId,
          cacheKey: params.cacheKey,
          plan,
        };
        setCardNarrationBeats(plan.beats);
        setCardActiveBeatIdx(0);
        setCardNarrationSubtitle(plan.script);
        setActiveStoryboard(plan.storyboard);
        setStoryboardStepIdx(0);
        setStoryboardPlaying(false);
        setStoryboardVoiceSynced(true);

        await playPlanWithFallback({
          cachePrefix: `doc:${params.cacheKey}`,
          plan,
          onStartAudio: () => {
            if (cardNarrationRunIdRef.current === runId) {
              setCardNarrationLoadingId(null);
            }
          },
          onBeatStart: (beatIdx) => {
            if (cardNarrationRunIdRef.current !== runId) return;
            setCardActiveBeatIdx(beatIdx);
            setStoryboardStepIdx(beatIdx);
            applyLiveNarrationFocus({
              text: plan.beats[beatIdx]?.narration || plan.script,
              event: EVENT_MAP[params.itemId] ?? null,
              baseStep: plan.storyboard.steps[beatIdx] ?? null,
              targetMode: 'card',
              fly: false,
            });
          },
          onChunkText: (chunkText, beatIdx) => {
            if (cardNarrationRunIdRef.current !== runId) return;
            applyLiveNarrationFocus({
              text: chunkText,
              event: EVENT_MAP[params.itemId] ?? null,
              baseStep: plan.storyboard.steps[beatIdx] ?? null,
              targetMode: 'card',
              fly: true,
            });
          },
        });
      } catch (err) {
        if (cardNarrationRunIdRef.current !== runId) return;
        setCardNarrationLoadingId(null);
        if (err instanceof AiClientError && err.code === 'aborted') {
          return;
        }
        if (
          !isStoryMode &&
          err instanceof AiClientError &&
          (err.code === 'passcode_invalid' ||
            err.code === 'passcode_unconfigured' ||
            err.code === 'not_configured')
        ) {
          setCardNarratingId(null);
          setCardNarrationSubtitle(null);
          setCardNarrationBeats(null);
          setStoryboardVoiceSynced(false);
          setAiUnlocked(false);
          openAiWithIntent({ tab: 'tutor' });
          return;
        }
        setCardNarrationSubtitle(params.fallbackText);
        await speakWithBrowserSpeech(params.fallbackText);
      } finally {
        if (cardNarrationRunIdRef.current === runId) {
          setCardNarrationLoadingId(null);
          setCardNarratingId(null);
          setStoryboardVoiceSynced(false);
          setNarrationFocus(null);
          lastVisualFocusKeyRef.current = '';
        }
      }
    },
    [openAiWithIntent, applyLiveNarrationFocus],
  );

  const handleSelectCardNarrationBeat = useCallback(async (beatIdx: number) => {
    const ctx = cardDocContextRef.current;
    if (!ctx) {
      setStoryboardPlaying(false);
      setStoryboardStepIdx(beatIdx);
      setCardActiveBeatIdx(beatIdx);
      return;
    }

    const runId = ++cardNarrationRunIdRef.current;
    const sliceBeats = ctx.plan.beats.slice(beatIdx);
    if (sliceBeats.length === 0) return;

    setCinemaMode(false);
    stopActiveNarration();
    setCardNarratingId(ctx.itemId);
    setCardNarrationLoadingId(ctx.itemId);
    setCardNarrationBeats(ctx.plan.beats);
    setCardActiveBeatIdx(beatIdx);
    setCardNarrationSubtitle(ctx.plan.script);
    setActiveStoryboard(ctx.plan.storyboard);
    setStoryboardStepIdx(beatIdx);
    setStoryboardPlaying(false);
    setStoryboardVoiceSynced(true);

    try {
      if (ctx.staticAudioUrls && ctx.staticAudioUrls.length === ctx.plan.beats.length) {
        await playStaticAudioBeats({
          beats: ctx.plan.beats.map((b, idx) => ({
            audioUrl: ctx.staticAudioUrls![idx],
            narration: b.narration,
          })),
          startIndex: beatIdx,
          onStartAudio: () => {
            if (cardNarrationRunIdRef.current === runId) {
              setCardNarrationLoadingId(null);
            }
          },
          onBeatStart: (bIdx) => {
            if (cardNarrationRunIdRef.current !== runId) return;
            setCardActiveBeatIdx(bIdx);
            setStoryboardStepIdx(bIdx);
          },
        });
        return;
      }

      const subPlan: AiDocumentaryPlan = {
        ...ctx.plan,
        beats: sliceBeats,
      };
      await playPlanWithFallback({
        cachePrefix: `doc:${ctx.cacheKey}:b${beatIdx}`,
        plan: subPlan,
        onStartAudio: () => {
          if (cardNarrationRunIdRef.current === runId) {
            setCardNarrationLoadingId(null);
          }
        },
        onBeatStart: (relIdx) => {
          if (cardNarrationRunIdRef.current !== runId) return;
          const bIdx = beatIdx + relIdx;
          setCardActiveBeatIdx(bIdx);
          setStoryboardStepIdx(bIdx);
        },
      });
    } catch (err) {
      if (cardNarrationRunIdRef.current !== runId) return;
      if (err instanceof AiClientError && err.code === 'aborted') {
        return;
      }
    } finally {
      if (cardNarrationRunIdRef.current === runId) {
        setCardNarrationLoadingId(null);
        setCardNarratingId(null);
        setStoryboardVoiceSynced(false);
      }
    }
  }, []);

  const handleNarrateEvent = useCallback(
    async (ev: HistoryEvent) => {
      const evEra = getEraForYear(ev.year);
      const evSub = getSubPeriodForYear(ev.year);
      const causal = buildEventCausalContext(ev);
      const localStoryPlan = buildDeepEventStoryPlan(ev, evEra, evSub);
      await runCardDocumentaryNarration({
        itemId: ev.id,
        cacheKey: `ev:${ev.id}`,
        title: ev.title,
        year: ev.year,
        yearDisplay: ev.dateDisplay,
        coords: ev.coords,
        eraName: evEra.name,
        subPeriodName: evSub.name,
        regionLabel: REGION_META[ev.region].label,
        summary: ev.card.summary,
        geography: ev.card.geography,
        politics: ev.card.politics,
        economy: ev.card.economy,
        culture: ev.card.culture,
        consequence: ev.card.consequence,
        causesText: causal.causesText,
        effectsText: causal.effectsText,
        keyFiguresText: causal.keyFiguresText,
        debate: ev.card.debate,
        localStoryPlan,
        loadingMessage: '正在撰写长篇听书脚本与因果同步地图...',
        fallbackText: localStoryPlan.script,
      });
    },
    [runCardDocumentaryNarration],
  );

  const handleNarrateFigure = useCallback(
    async (fig: HistoricalFigure) => {
      const figEra = getEraForYear(fig.activeYear);
      const localStoryPlan = buildDeepFigureStoryPlan(fig, figEra);
      await runCardDocumentaryNarration({
        itemId: fig.id,
        cacheKey: `fig:${fig.id}`,
        title: `${fig.name}（${fig.title}）`,
        year: fig.activeYear,
        yearDisplay: fig.lifespanDisplay,
        coords: fig.coords,
        eraName: figEra.name,
        regionLabel: REGION_META[fig.region].label,
        summary: fig.card.oneLiner,
        geography: fig.card.eraContext,
        politics: fig.card.eraContext,
        economy: fig.card.coreContributions,
        consequence: fig.card.historicalImpact,
        localStoryPlan,
        loadingMessage: '正在撰写人物长篇传记解说与分镜...',
        fallbackText: localStoryPlan.script,
      });
    },
    [runCardDocumentaryNarration],
  );

  const handleNarratePeriod = useCallback(
    async (era: Era, subPeriod: SubPeriod) => {
      const eraPlan = buildEraBridgePlan(era);
      const spPlan = buildSubPeriodBridgePlan(era, subPeriod);
      const combinedPlan: AiDocumentaryPlan = {
        script: `${eraPlan.script}\n\n${spPlan.script}`,
        beats: [...eraPlan.beats, ...spPlan.beats],
        storyboard: {
          title: `${era.name} · ${subPeriod.name}`,
          steps: [...eraPlan.storyboard.steps, ...spPlan.storyboard.steps],
        },
      };
      await runCardDocumentaryNarration({
        itemId: `period:${subPeriod.id}`,
        cacheKey: `period:${subPeriod.id}`,
        title: `${era.name} · ${subPeriod.name}`,
        year: subPeriod.startYear,
        yearDisplay: `${subPeriod.startYear} — ${subPeriod.endYear}`,
        coords: spPlan.storyboard.steps[0]?.center ?? [42, 28],
        eraName: era.name,
        subPeriodName: subPeriod.name,
        summary: subPeriod.themeSummary,
        localStoryPlan: combinedPlan,
        skipRemote: true,
        loadingMessage: '正在加载时代演进脉络听书章节...',
        fallbackText: combinedPlan.script,
      });
    },
    [runCardDocumentaryNarration],
  );

  const countryFocus = useMemo<CountryFocusSpec | null>(() => {
    if (!activeCountry) return null;
    return {
      accentColor: activeCountry.accentColor,
      matchEnNames: activeCountry.highlightEnNames,
      matchZhNames: activeCountry.highlightZhNames,
    };
  }, [activeCountry]);

  const enterCountryEvolution = useCallback(
    (resolved: ResolvedCountryEvolution, preserveYear = false) => {
      stopAiNarrationAndStage(true, true);
      setIsPlaying(false);
      setCinemaMode(false);
      setActiveStoryline(null);
      setStoryAutoPlay(false);
      setRecentTriggerEventId(null);
      setSelectedEventId(null);
      setSelectedFigureId(null);
      setFocusRouteId(null);
      setTickerVisible(false);
      setCountryPlaying(false);
      setCountryFullReading(false);
      setActiveCountry(resolved);

      if (!preserveYear && resolved.stages.length > 0) {
        const curStage = findMatchingStageIndex(resolved.stages, currentYearRef.current);
        if (curStage === -1) {
          setCurrentYear(resolved.stages[resolved.stages.length - 1].snapshotYear);
        }
      }

      window.requestAnimationFrame(() => {
        flyToLocation(resolved.coords, resolved.zoom, { exactZoom: true, duration: 750 });
      });
    },
    [flyToLocation, stopAiNarrationAndStage],
  );

  const handleSelectPolity = useCallback(
    async (polity: ClickedPolityPayload) => {
      let idx = countryIndex;
      if (!idx) {
        try {
          idx = await loadCountryEvolutionIndex();
          setCountryIndex(idx);
        } catch {
          idx = null;
        }
      }
      const resolved = resolveCountryEvolution(polity, idx);
      enterCountryEvolution(resolved, true);
    },
    [countryIndex, enterCountryEvolution],
  );

  const handleSelectCuratedCountry = useCallback(
    async (profileId: string) => {
      const profile = COUNTRY_PROFILE_MAP[profileId];
      if (!profile) return;
      let idx = countryIndex;
      if (!idx) {
        try {
          idx = await loadCountryEvolutionIndex();
          setCountryIndex(idx);
        } catch {
          idx = null;
        }
      }
      const resolved = resolveCuratedCountry(profile, idx);
      enterCountryEvolution(resolved, false);
    },
    [countryIndex, enterCountryEvolution],
  );

  const handleSelectModernCountry = useCallback(
    async (modernKey: string) => {
      let idx = countryIndex;
      if (!idx) {
        try {
          idx = await loadCountryEvolutionIndex();
          setCountryIndex(idx);
        } catch {
          idx = null;
        }
      }
      const resolved = resolveModernCountry(modernKey, idx);
      if (resolved) enterCountryEvolution(resolved, true);
    },
    [countryIndex, enterCountryEvolution],
  );

  const handleExitCountryMode = useCallback(() => {
    setCountryPlaying(false);
    setCountryFullReading(false);
    setActiveCountry(null);
    window.requestAnimationFrame(() => {
      flyToLocation(window.innerWidth >= 1024 ? [52, 22] : [28, 22], window.innerWidth < 640 ? 1.2 : 1.5, {
        exactZoom: true,
        duration: 700,
      });
    });
  }, [flyToLocation]);

  const handleJumpFromCountryToEvent = useCallback(
    (ev: HistoryEvent) => {
      setCountryPlaying(false);
      setCountryFullReading(false);
      setActiveCountry(null);
      handleSelectEvent(ev);
    },
    [handleSelectEvent],
  );

  const handleJumpFromCountryToFigure = useCallback(
    (fig: HistoricalFigure) => {
      setCountryPlaying(false);
      setCountryFullReading(false);
      setActiveCountry(null);
      handleSelectFigure(fig);
    },
    [handleSelectFigure],
  );

  const handleNarrateCountryStage = useCallback(
    async (stage: ResolvedCountryEvolution['stages'][number]) => {
      if (!activeCountry) return;
      if (narratingStageId === stage.id) {
        stopActiveNarration();
        setNarratingStageId(null);
        setCountrySpokenText(null);
        return;
      }
      setCountryPlaying(false);
      setCurrentYear(stage.snapshotYear);
      const fallbackScript = `${activeCountry.name}，${stage.periodDisplay}，${stage.name}。${stage.summary}`;
      setNarratingStageId(stage.id);
      setCountrySpokenText(fallbackScript);
      try {
        const entry =
          getVoicePrefs().engine !== 'browser'
            ? await getPreGeneratedAudio(`country:${activeCountry.id}:${stage.id}`)
            : null;
        const script = entry?.script || fallbackScript;
        setCountrySpokenText(script);
        const audioUrl = entry?.file ? resolveAudioFileUrl(entry.file) : null;
        await playSingleStaticAudio({
          audioUrl,
          script,
          playbackRate: mapTimelineSpeedToAudioRate(countrySpeedRef.current),
        });
      } finally {
        setNarratingStageId((cur) => (cur === stage.id ? null : cur));
        setCountrySpokenText(null);
      }
    },
    [activeCountry, narratingStageId],
  );

  // Country Mode stage autoplay with voice synchronization & speed control
  useEffect(() => {
    if (!activeCountry || !countryPlaying) return;
    const stages = activeCountry.stages;
    if (stages.length === 0) {
      setCountryPlaying(false);
      return;
    }

    let cancelled = false;
    let timerId = 0;

    void (async () => {
      let idx = Math.max(0, findMatchingStageIndex(stages, currentYearRef.current));
      for (; idx < stages.length; idx++) {
        if (cancelled) break;
        const stage = stages[idx];
        setCurrentYear(stage.snapshotYear);

        if (countryVoiceEnabledRef.current) {
          const fallbackScript = `${activeCountry.name}，${stage.periodDisplay}，${stage.name}。${stage.summary}`;
          setNarratingStageId(stage.id);
          setCountrySpokenText(fallbackScript);
          try {
            const entry =
              getVoicePrefs().engine !== 'browser'
                ? await getPreGeneratedAudio(`country:${activeCountry.id}:${stage.id}`)
                : null;
            if (cancelled) break;
            const script = entry?.script || fallbackScript;
            setCountrySpokenText(script);
            const audioUrl = entry?.file ? resolveAudioFileUrl(entry.file) : null;
            const mode = await playSingleStaticAudio({
              audioUrl,
              script,
              playbackRate: mapTimelineSpeedToAudioRate(countrySpeedRef.current),
            });
            if (cancelled || mode === 'silent') break;
          } catch {
            // Fallback pause if audio fails
          }
          if (cancelled) break;
          await new Promise<void>((r) => {
            timerId = window.setTimeout(r, Math.round(450 / Math.max(0.5, countrySpeedRef.current)));
          });
        } else {
          setNarratingStageId(null);
          setCountrySpokenText(null);
          await new Promise<void>((r) => {
            timerId = window.setTimeout(r, Math.round(2100 / Math.max(0.5, countrySpeedRef.current)));
          });
        }
      }
      if (!cancelled) {
        setCountryPlaying(false);
        setNarratingStageId(null);
        setCountrySpokenText(null);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      stopActiveNarration();
      setNarratingStageId(null);
      setCountrySpokenText(null);
    };
  }, [activeCountry, countryPlaying]);

  // Global keyboard shortcuts (Space play/pause, Left/Right step milestone, [/] speed, M voice, B BGM)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (aiOpen || pulseOpen || economicAtlasOpen || techAtlasOpen || storyPickerOpen || searchOpen || causalGraphOpen) {
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement | null)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space' && !activeCountry) {
        e.preventDefault();
        if (cinemaMode) {
          setCinemaMode(false);
          stopActiveNarration();
        } else {
          stopAiNarrationAndStage(true, true);
          setIsPlaying((p) => {
            const next = !p;
            if (next) setTickerVisible(true);
            return next;
          });
        }
      } else if (e.key === 'ArrowLeft' && !activeCountry) {
        e.preventDefault();
        handleStepMilestone(-1);
      } else if (e.key === 'ArrowRight' && !activeCountry) {
        e.preventDefault();
        handleStepMilestone(1);
      } else if (e.key === '[') {
        setPlaySpeed((s) => {
          const i = PLAY_SPEEDS.indexOf(s);
          return i > 0 ? PLAY_SPEEDS[i - 1] : PLAY_SPEEDS[0];
        });
      } else if (e.key === ']') {
        setPlaySpeed((s) => {
          const i = PLAY_SPEEDS.indexOf(s);
          return i !== -1 && i < PLAY_SPEEDS.length - 1 ? PLAY_SPEEDS[i + 1] : PLAY_SPEEDS[PLAY_SPEEDS.length - 1];
        });
      } else if (e.key === 'm' || e.key === 'M') {
        setTimelineVoiceEnabled((v) => {
          const next = !v;
          if (!next) {
            stopActiveNarration();
            setTickerNarrationStatus('idle');
            setTickerSpokenText(null);
          }
          return next;
        });
      } else if (e.key === 'b' || e.key === 'B') {
        setAmbientEnabledState((prev) => {
          const next = !prev;
          setAmbientEnabled(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    aiOpen,
    pulseOpen,
    economicAtlasOpen,
    techAtlasOpen,
    storyPickerOpen,
    searchOpen,
    causalGraphOpen,
    activeCountry,
    cinemaMode,
    stopAiNarrationAndStage,
    handleStepMilestone,
  ]);

  // Escape key returns to World Map when in Country Mode and no modal is open
  useEffect(() => {
    if (aiOpen) {
      const handleAiEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          stopActiveNarration();
          setAiOpen(false);
        }
      };
      window.addEventListener('keydown', handleAiEsc);
      return () => window.removeEventListener('keydown', handleAiEsc);
    }
    if (!activeCountry || pulseOpen || economicAtlasOpen || techAtlasOpen || storyPickerOpen || searchOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExitCountryMode();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [aiOpen, activeCountry, pulseOpen, storyPickerOpen, searchOpen, handleExitCountryMode]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {activeCountry ? (
        <CountryEvolutionHeader
          country={activeCountry}
          currentYear={currentYear}
          snapshotYear={activeSnapshot?.year ?? null}
          projection={projection}
          theme={theme}
          fullReading={countryFullReading}
          onExit={handleExitCountryMode}
          onSelectCuratedCountry={handleSelectCuratedCountry}
          onToggleFullReading={() => setCountryFullReading((v) => !v)}
          onToggleProjection={toggleProjection}
          onToggleTheme={toggleTheme}
          onOpenAiStudio={() => openAiWithIntent({ tab: 'tutor' })}
        />
      ) : (
        <TopBar
          currentYear={currentYear}
          currentEra={currentEra}
          currentSubPeriod={currentSubPeriod}
          snapshotYear={activeSnapshot?.year ?? null}
          selectedDimensions={selectedDimensions}
          showAllEras={showAllEras}
          showRoutes={showRoutes}
          showFigures={showFigures}
          showRelief={showRelief}
          showLandmarks={showLandmarks}
          projection={projection}
          theme={theme}
          onToggleDimension={handleToggleDimension}
          onToggleShowAllEras={() => setShowAllEras((v) => !v)}
          onToggleRoutes={() => setShowRoutes((v) => !v)}
          onToggleFigures={() => setShowFigures((v) => !v)}
          onToggleRelief={() => setShowRelief((v) => !v)}
          onToggleLandmarks={() => setShowLandmarks((v) => !v)}
          onToggleProjection={toggleProjection}
          onToggleTheme={toggleTheme}
          onOpenPulse={() => {
            stopAiNarrationAndStage(true, true);
            setPulseOpen(true);
          }}
          onOpenEconomicAtlas={() => {
            stopAiNarrationAndStage(true, true);
            setEconomicAtlasOpen(true);
          }}
          onOpenTechAtlas={() => {
            stopAiNarrationAndStage(true, true);
            setTechAtlasOpen(true);
          }}
          onOpenStorylines={() => {
            stopAiNarrationAndStage(true, true);
            setStoryPickerOpen(true);
          }}
          onOpenCausalGraph={() => {
            stopAiNarrationAndStage(true, true);
            setCausalGraphOpen(true);
          }}
          timeSwipeOpen={timeSwipeOpen}
          onToggleTimeSwipe={() => {
            stopAiNarrationAndStage(true, true);
            setTimeSwipeOpen((v) => !v);
          }}
          onOpenSearch={() => {
            stopAiNarrationAndStage(true, true);
            setSearchOpen(true);
          }}
          onOpenAiStudio={() => openAiWithIntent({ tab: 'tutor' })}
          aiUnlocked={aiUnlocked}
        />
      )}

      <main className="relative flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div
          className={
            activeCountry
              ? countryFullReading
                ? 'hidden'
                : 'relative h-[36vh] min-h-[220px] lg:h-full lg:w-[52%] shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r'
              : 'relative flex-1 h-full w-full overflow-hidden'
          }
          style={activeCountry ? { borderColor: 'var(--border-subtle)' } : undefined}
        >
          <WorldMap
            theme={theme}
            projection={projection}
            currentYear={currentYear}
            isPlaying={isPlaying || cinemaMode || countryPlaying}
            physical={physical}
            snapshot={activeSnapshot}
            events={visibleEvents}
            figures={visibleFigures}
            selectedEvent={selectedEvent}
            selectedFigure={selectedFigure}
            recentTriggerEventId={recentTriggerEventId}
            activeRoutes={activeRoutes}
            focusRouteId={focusRouteId}
            showRelief={showRelief}
            showLandmarks={showLandmarks}
            countryFocus={activeCountry ? countryFocus : (narrationFocus?.countryFocus ?? null)}
            focusedCountries={!activeCountry ? (narrationFocus?.matchedCountries ?? []) : []}
            narrationConceptKind={!activeCountry ? (narrationFocus?.concept.kind ?? null) : null}
            isCountryMode={Boolean(activeCountry)}
            cinemaMode={cinemaMode}
            eraId={currentEra.id}
            rightDrawerVisible={!desktopCollapsed}
            aiScene={
              !activeCountry
                ? (cinemaScene ?? tickerScene ?? activeStoryboard?.steps[storyboardStepIdx] ?? null)
                : null
            }
            aiStageOpen={aiOpen}
            cinemaTickerVisible={!activeCountry && !activeStoryline && tickerVisible && cinemaMode}
            flyTarget={flyTarget}
            onSelectEvent={(ev) => handleSelectEvent(ev)}
            onSelectFigure={(fig) => handleSelectFigure(fig)}
            onSelectPolity={handleSelectPolity}
            onDeselectEvent={() => {
              setSelectedEventId(null);
              setSelectedFigureId(null);
            }}
            onMapInstance={setMainMapInstance}
          />

          {!activeCountry && (
            <TimeSwipeOverlay
              open={timeSwipeOpen}
              mainMap={mainMapInstance}
              physical={physical}
              snapshots={snapshots}
              currentYear={currentYear}
              activeSnapshotYear={activeSnapshot?.year ?? null}
              theme={theme}
              projection={projection}
              onSelectRightYear={applyYearChange}
              onClose={() => setTimeSwipeOpen(false)}
            />
          )}

          {activeCountry && (
            <CountryMapDock
              country={activeCountry}
              currentYear={currentYear}
              isPlaying={countryPlaying}
              playSpeed={countrySpeed}
              speedOptions={[0.5, 1, 1.5, 2]}
              voiceEnabled={countryVoiceEnabled}
              spokenText={countrySpokenText}
              theme={theme}
              onTogglePlay={() => setCountryPlaying((p) => !p)}
              onSelectSpeed={setCountrySpeed}
              onToggleVoice={() => {
                setCountryVoiceEnabled((prev) => {
                  const next = !prev;
                  if (!next) {
                    stopActiveNarration();
                    setNarratingStageId(null);
                    setCountrySpokenText(null);
                  }
                  return next;
                });
              }}
              onSelectYear={(yr) => {
                setCountryPlaying(false);
                stopActiveNarration();
                setCurrentYear(yr);
              }}
            />
          )}

          {!activeCountry && (
            <>
              <CinemaStageOverlay
                visible={
                  !activeStoryline &&
                  !aiOpen &&
                  (cinemaMode ||
                    Boolean(cardNarratingId) ||
                    (isPlaying &&
                      timelineVoiceEnabled &&
                      (Boolean(tickerSpokenText) || Boolean(tickerBeats?.length))))
                }
                theme={theme}
                currentYear={currentYear}
                currentEra={currentEra}
                event={cinemaMode ? tickerEvent : selectedEvent || tickerEvent}
                chapterLabel={cinemaMode ? cinemaChapterLabel : isPlaying ? tickerChapterLabel : null}
                beats={
                  cinemaMode
                    ? cinemaBeats
                    : cardNarratingId
                      ? cardNarrationBeats
                      : tickerBeats
                }
                activeBeatIndex={
                  cinemaMode
                    ? cinemaActiveBeatIdx
                    : cardNarratingId
                      ? cardActiveBeatIdx
                      : tickerActiveBeatIdx
                }
                subtitle={
                  cinemaMode
                    ? cinemaSubtitle
                    : cardNarratingId
                      ? cardNarrationSubtitle
                      : tickerSpokenText
                }
                rightDrawerVisible={!desktopCollapsed}
                focusedCountries={narrationFocus?.matchedCountries ?? []}
                visualConcept={narrationFocus?.concept ?? null}
                onExpandDetails={() => setDesktopCollapsed(false)}
                onSelectCountryProfile={(id) => void handleSelectCuratedCountry(id)}
              />

              <ChronicleTicker
                visible={!activeStoryline && tickerVisible}
                cinemaMode={cinemaMode}
                isPlaying={isPlaying}
                currentYear={currentYear}
                currentEra={currentEra}
                currentSubPeriod={currentSubPeriod}
                event={tickerEvent || selectedEvent}
                theme={theme}
                playSpeed={playSpeed}
                speedOptions={PLAY_SPEEDS}
                voiceEnabled={cinemaMode ? cinemaVoiceEnabled : timelineVoiceEnabled}
                narrationDepth={narrationDepth}
                onToggleNarrationDepth={handleToggleNarrationDepth}
                syncCardDuringPlay={syncCardDuringPlay}
                narrationStatus={cinemaMode ? cinemaNarrationStatus : tickerNarrationStatus}
                narrationSubtitle={cinemaMode ? cinemaSubtitle : null}
                narrationBeats={cinemaMode ? cinemaBeats : tickerBeats}
                activeBeatIndex={cinemaMode ? cinemaActiveBeatIdx : tickerActiveBeatIdx}
                chapterLabel={cinemaMode ? cinemaChapterLabel : tickerChapterLabel}
                tickerSpokenText={tickerSpokenText}
                onSelectSpeed={setPlaySpeed}
                onToggleVoice={() => {
                  if (cinemaMode) {
                    setCinemaVoiceEnabled((prev) => {
                      const next = !prev;
                      if (!next) {
                        stopActiveNarration();
                        setCinemaNarrationStatus('idle');
                        setCinemaBeats(null);
                        setCinemaChapterLabel(null);
                        setCinemaScene(null);
                      }
                      return next;
                    });
                  } else {
                    setTimelineVoiceEnabled((prev) => {
                      const next = !prev;
                      if (!next) {
                        stopActiveNarration();
                        setTickerNarrationStatus('idle');
                        setTickerSpokenText(null);
                        setTickerBeats(null);
                        setTickerChapterLabel(null);
                      }
                      return next;
                    });
                  }
                }}
                onToggleSyncCard={() => setSyncCardDuringPlay((v) => !v)}
                rightDrawerVisible={!desktopCollapsed}
                onSelectEvent={(ev) => handleSelectEvent(ev)}
                onStopPlayback={() => {
                  setIsPlaying(false);
                  setCinemaMode(false);
                  setRecentTriggerEventId(null);
                  setCinemaBeats(null);
                  setCinemaChapterLabel(null);
                  setCinemaScene(null);
                  setTickerBeats(null);
                  setTickerChapterLabel(null);
                  setTickerScene(null);
                  setNarrationFocus(null);
                  lastVisualFocusKeyRef.current = '';
                  stopActiveNarration();
                }}
                onDismiss={() => setTickerVisible(false)}
              />

              {dataError && (
                <div
                  className="absolute left-1/2 top-4 -translate-x-1/2 z-40 rounded-xl border px-4 py-2 text-xs shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: '#B83B3B',
                    color: '#B83B3B',
                  }}
                >
                  地图底图加载异常：{dataError}
                </div>
              )}

              {activeStoryline && (
                <StorylinePlayerBar
                  storyline={activeStoryline}
                  stepIndex={storyStepIdx}
                  autoPlaying={storyAutoPlay}
                  voiceEnabled={storyVoiceEnabled}
                  theme={theme}
                  onPrev={() => applyStoryStep(activeStoryline, Math.max(0, storyStepIdx - 1))}
                  onNext={() =>
                    applyStoryStep(
                      activeStoryline,
                      Math.min(activeStoryline.steps.length - 1, storyStepIdx + 1),
                    )
                  }
                  onToggleAuto={() => setStoryAutoPlay((v) => !v)}
                  onToggleVoice={() => {
                    setStoryVoiceEnabled((v) => {
                      const next = !v;
                      if (!next) stopActiveNarration();
                      return next;
                    });
                  }}
                  onExit={() => {
                    stopActiveNarration();
                    setActiveStoryline(null);
                    setStoryAutoPlay(false);
                  }}
                  onExpandCard={() => {
                    setDesktopCollapsed(false);
                    setSheetState('half');
                  }}
                />
              )}

              <EventCardPanel
                currentYear={currentYear}
                currentEra={currentEra}
                currentSubPeriod={currentSubPeriod}
                selectedEvent={selectedEvent}
                selectedFigure={selectedFigure}
                activeEvents={activeWindowEvents}
                activeFigures={activeWindowFigures}
                theme={theme}
                sheetState={sheetState}
                desktopCollapsed={desktopCollapsed}
                onChangeSheetState={setSheetState}
                onToggleDesktopCollapse={() => setDesktopCollapsed((v) => !v)}
                onSelectEvent={(ev) => handleSelectEvent(ev)}
                onSelectFigure={(fig) => handleSelectFigure(fig)}
                onCloseEvent={() => {
                  setSelectedEventId(null);
                  setFocusRouteId(null);
                }}
                onCloseFigure={() => {
                  setSelectedFigureId(null);
                }}
                onFocusRoute={(routeId) => {
                  setShowRoutes(true);
                  setFocusRouteId((cur) => (cur === routeId ? null : routeId));
                }}
                onAskAiAboutEvent={(ev) =>
                  openAiWithIntent({
                    tab: 'tutor',
                    prefillQuestion: `请用通俗的政治经济视角深挖「${ev.title}」的深层因果与历史后果`,
                    autoSend: true,
                  })
                }
                onAskAiAboutFigure={(fig) =>
                  openAiWithIntent({
                    tab: 'tutor',
                    prefillQuestion: `请分析${fig.name}在当时的历史制度与时代约束下，是如何做出关键抉择的？`,
                    autoSend: true,
                  })
                }
                onAskAiAboutEra={(era, subPeriod) =>
                  openAiWithIntent({
                    tab: 'tutor',
                    prefillQuestion: `请用通俗的政治经济与地理视角，串讲「${era.name} · ${subPeriod.name}」的核心演进主线`,
                    autoSend: true,
                  })
                }
                onCompareTopic={(subject) =>
                  openAiWithIntent({
                    tab: 'compare',
                    compareSubjectA: subject,
                  })
                }
                onNarrateEvent={(ev) => void handleNarrateEvent(ev)}
                onNarrateFigure={(fig) => void handleNarrateFigure(fig)}
                onNarratePeriod={(era, subPeriod) => void handleNarratePeriod(era, subPeriod)}
                narrationDepth={narrationDepth}
                narratingItemId={cardNarratingId}
                narrationLoadingId={cardNarrationLoadingId}
                narrationSubtitle={cardNarrationSubtitle}
                narrationBeats={cardNarrationBeats}
                activeBeatIndex={cardActiveBeatIdx}
                onSelectNarrationBeat={(idx) => {
                  void handleSelectCardNarrationBeat(idx);
                }}
                onStopNarration={handleStopCardNarration}
                cinemaNarratingEventId={
                  cinemaMode && (cinemaNarrationStatus !== 'idle' || Boolean(cinemaSubtitle))
                    ? tickerEventId
                    : null
                }
                cinemaBeats={cinemaBeats}
                cinemaActiveBeatIndex={cinemaActiveBeatIdx}
                cinemaSubtitle={cinemaSubtitle}
                suppressDesktop={aiOpen}
              />

              {!cinemaMode && activeStoryboard && (
                <AiStageBar
                  storyboard={activeStoryboard}
                  stepIndex={storyboardStepIdx}
                  isPlaying={storyboardPlaying}
                  voiceSynced={storyboardVoiceSynced}
                  theme={theme}
                  aiDrawerOpen={aiOpen}
                  onSelectStep={(idx) => {
                    setStoryboardVoiceSynced(false);
                    setStoryboardPlaying(false);
                    setStoryboardStepIdx(idx);
                  }}
                  onPrev={() => {
                    setStoryboardVoiceSynced(false);
                    setStoryboardPlaying(false);
                    setStoryboardStepIdx((i) => Math.max(0, i - 1));
                  }}
                  onNext={() => {
                    setStoryboardVoiceSynced(false);
                    setStoryboardPlaying(false);
                    setStoryboardStepIdx((i) =>
                      Math.min(activeStoryboard.steps.length - 1, i + 1),
                    );
                  }}
                  onTogglePlay={() => {
                    setStoryboardVoiceSynced(false);
                    if (storyboardStepIdx >= activeStoryboard.steps.length - 1 && !storyboardPlaying) {
                      setStoryboardStepIdx(0);
                      setStoryboardPlaying(true);
                    } else {
                      setStoryboardPlaying((p) => !p);
                    }
                  }}
                  onReplay={() => {
                    setStoryboardVoiceSynced(false);
                    setStoryboardStepIdx(0);
                    setStoryboardPlaying(true);
                  }}
                  onClose={() => {
                    stopAiNarrationAndStage(true);
                  }}
                  onOpenAiDrawer={() => setAiOpen(true)}
                />
              )}
            </>
          )}
        </div>

        {activeCountry && (
          <CountryEvolutionPanel
            country={activeCountry}
            currentYear={currentYear}
            theme={theme}
            fullReading={countryFullReading}
            narratingStageId={narratingStageId}
            onSelectYear={(yr) => {
              setCountryPlaying(false);
              setCurrentYear(yr);
            }}
            onSelectModernCountry={handleSelectModernCountry}
            onSelectEventInWorld={handleJumpFromCountryToEvent}
            onSelectFigureInWorld={handleJumpFromCountryToFigure}
            onNarrateStage={(st) => void handleNarrateCountryStage(st)}
            onAskAiAboutCountry={(c) =>
              openAiWithIntent({
                tab: 'tutor',
                prefillQuestion: `请用“地理基因 → 政治制度 → 财税经济”的主线讲透「${c.name}」的演变规律`,
                autoSend: true,
              })
            }
            onCompareCountry={(c) =>
              openAiWithIntent({
                tab: 'compare',
                compareSubjectA: c.name,
              })
            }
            onRequireAiUnlock={() => openAiWithIntent({ tab: 'tutor' })}
          />
        )}
      </main>

      {!activeCountry && (
        <TimelineDock
          currentYear={currentYear}
          currentEra={currentEra}
          currentSubPeriod={currentSubPeriod}
          events={dimensionFilteredEvents}
          snapshots={snapshots}
          activeSnapshotYear={activeSnapshot?.year ?? null}
          isPlaying={isPlaying}
          cinemaMode={cinemaMode}
          playSpeed={playSpeed}
          speedOptions={PLAY_SPEEDS}
          voiceEnabled={cinemaMode ? cinemaVoiceEnabled : timelineVoiceEnabled}
          ambientEnabled={ambientEnabled}
          timelineZoom={timelineZoom}
          theme={theme}
          onChangeYear={applyYearChange}
          onSelectEra={handleSelectEra}
          onTogglePlay={() => {
            stopAiNarrationAndStage(true, true);
            setCinemaMode(false);
            setIsPlaying((p) => {
              const next = !p;
              if (next) setTickerVisible(true);
              return next;
            });
          }}
          onToggleCinemaMode={() => {
            stopAiNarrationAndStage(true, true);
            setIsPlaying(false);
            setActiveStoryline(null);
            setStoryAutoPlay(false);
            setCinemaMode((c) => {
              const next = !c;
              if (next) setTickerVisible(true);
              else setRecentTriggerEventId(null);
              return next;
            });
          }}
          onSelectSpeed={setPlaySpeed}
          onToggleVoice={() => {
            if (cinemaMode) {
              setCinemaVoiceEnabled((prev) => {
                const next = !prev;
                if (!next) {
                  stopActiveNarration();
                  setCinemaNarrationStatus('idle');
                  setCinemaBeats(null);
                  setCinemaScene(null);
                }
                return next;
              });
            } else {
              setTimelineVoiceEnabled((prev) => {
                const next = !prev;
                if (!next) {
                  stopActiveNarration();
                  setTickerNarrationStatus('idle');
                  setTickerSpokenText(null);
                }
                return next;
              });
            }
          }}
          onToggleAmbient={() => {
            setAmbientEnabledState((prev) => {
              const next = !prev;
              setAmbientEnabled(next);
              return next;
            });
          }}
          onToggleTimelineZoom={() => setTimelineZoom((z) => (z === 'global' ? 'era' : 'global'))}
          onPrevMilestone={() => handleStepMilestone(-1)}
          onNextMilestone={() => handleStepMilestone(1)}
          onStepSnapshot={handleStepSnapshot}
        />
      )}

      <WorldPulseModal
        open={pulseOpen}
        currentYear={currentYear}
        theme={theme}
        onClose={() => setPulseOpen(false)}
        onJumpToYear={(yr) => {
          applyYearChange(yr);
        }}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
      />

      <EconomicAtlasModal
        open={economicAtlasOpen}
        currentYear={currentYear}
        theme={theme}
        onClose={() => setEconomicAtlasOpen(false)}
        onJumpToYear={(yr) => {
          applyYearChange(yr);
        }}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
        onSelectCountry={(countryId) => {
          setEconomicAtlasOpen(false);
          handleSelectCuratedCountry(countryId);
        }}
      />

      <TechAtlasModal
        open={techAtlasOpen}
        currentYear={currentYear}
        theme={theme}
        onClose={() => setTechAtlasOpen(false)}
        onJumpToYear={(yr) => {
          applyYearChange(yr);
        }}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
        onSelectCountry={(countryId) => {
          setTechAtlasOpen(false);
          handleSelectCuratedCountry(countryId);
        }}
      />

      <StorylinePickerModal
        open={storyPickerOpen}
        theme={theme}
        onClose={() => setStoryPickerOpen(false)}
        onStartStoryline={(sl) => {
          setCinemaMode(false);
          setActiveStoryline(sl);
          setStoryAutoPlay(false);
          if (window.innerWidth < 1024) setSheetState('peek');
          applyStoryStep(sl, 0);
        }}
      />

      <SearchAndProgressModal
        open={searchOpen}
        theme={theme}
        onClose={() => setSearchOpen(false)}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
        onSelectFigure={(fig) => handleSelectFigure(fig)}
      />

      <CausalGraphModal
        open={causalGraphOpen}
        theme={theme}
        initialFocusEventId={selectedEventId}
        onClose={() => setCausalGraphOpen(false)}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
      />

      <AiStudioModal
        open={aiOpen}
        theme={theme}
        context={aiContext}
        eraId={currentEra.id}
        intent={aiIntent}
        hasActiveStoryboard={Boolean(activeStoryboard)}
        activeStoryboard={activeStoryboard}
        activeStoryboardStepIdx={storyboardStepIdx}
        onPlayStoryboard={handlePlayStoryboard}
        onSyncStoryboardStep={handleSyncStoryboardStep}
        onVoiceSyncEnd={() => setStoryboardVoiceSynced(false)}
        onUnlockChange={setAiUnlocked}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
}

export default App;
