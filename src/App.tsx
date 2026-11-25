import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AiStageBar } from './components/AiStageBar';
import { AiStudioModal, type AiStudioIntent } from './components/AiStudioModal';
import { ChronicleTicker } from './components/ChronicleTicker';
import {
  CountryEvolutionHeader,
  CountryEvolutionPanel,
  CountryMapDock,
} from './components/CountryEvolutionView';
import { EventCardPanel } from './components/EventCardPanel';
import { SearchAndProgressModal } from './components/SearchAndProgressModal';
import { StorylinePickerModal, StorylinePlayerBar } from './components/StorylineOverlay';
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
  HistoricalFigure,
  HistoryEvent,
  ResolvedCountryEvolution,
  SnapshotMeta,
  Storyline,
} from './types/history';
import {
  AiClientError,
  generateNarration,
  getStoredPasscode,
  playNarrationClip,
  speakWithBrowserSpeech,
  stopActiveNarration,
  type AiStoryboard,
  type AiTutorContext,
} from './utils/aiClient';
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
const PLAY_SPEEDS = [0.5, 1, 2, 4];

export function App() {
  const {
    studyData,
    theme,
    projection,
    toggleMastered,
    toggleBookmark,
    setNote,
    exportJson,
    importJson,
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
    duration?: number;
    nonce: number;
  } | null>(null);

  const [pulseOpen, setPulseOpen] = useState(false);
  const [storyPickerOpen, setStoryPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Gemini AI Studio & Voice Narration state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiIntent, setAiIntent] = useState<AiStudioIntent | null>(null);
  const [aiUnlocked, setAiUnlocked] = useState(() => Boolean(getStoredPasscode()));
  const [cinemaVoiceEnabled, setCinemaVoiceEnabled] = useState(true);
  const [cinemaNarrationStatus, setCinemaNarrationStatus] = useState<
    'idle' | 'loading' | 'playing' | 'browser'
  >('idle');
  const [cinemaSubtitle, setCinemaSubtitle] = useState<string | null>(null);
  const [cardNarratingId, setCardNarratingId] = useState<string | null>(null);
  const [cardNarrationLoadingId, setCardNarrationLoadingId] = useState<string | null>(null);
  const [cardNarrationSubtitle, setCardNarrationSubtitle] = useState<string | null>(null);
  const [activeStoryboard, setActiveStoryboard] = useState<AiStoryboard | null>(null);
  const [storyboardStepIdx, setStoryboardStepIdx] = useState(0);
  const [storyboardPlaying, setStoryboardPlaying] = useState(false);

  const [activeStoryline, setActiveStoryline] = useState<Storyline | null>(null);
  const [storyStepIdx, setStoryStepIdx] = useState(0);
  const [storyAutoPlay, setStoryAutoPlay] = useState(false);

  // Country Historical Evolution view state
  const [countryIndex, setCountryIndex] = useState<CountryEvolutionIndex | null>(null);
  const [activeCountry, setActiveCountry] = useState<ResolvedCountryEvolution | null>(null);
  const [countryPlaying, setCountryPlaying] = useState(false);
  const [countryFullReading, setCountryFullReading] = useState(false);

  // Map geospatial datasets
  const [physical, setPhysical] = useState<PhysicalAtlasData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<DecodedSnapshot | null>(null);
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

  // Auto-clear event shockwave halo outside Cinema Mode holds
  useEffect(() => {
    if (!recentTriggerEventId || cinemaMode) return;
    const timer = window.setTimeout(() => setRecentTriggerEventId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [recentTriggerEventId, cinemaMode]);

  // Smooth chronological playback via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || cinemaMode) return;
    let rafId = 0;
    let lastTime = performance.now();
    const scopedEra = timelineZoom === 'era' ? currentEraRef.current : null;
    let progress = scopedEra
      ? eraYearToProgress(currentYearRef.current, scopedEra)
      : yearToProgress(currentYearRef.current);
    let lastCrossYear = currentYearRef.current;

    const tick = (now: number) => {
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
        let bestCrossed: HistoryEvent | null = null;
        for (const ev of dimensionFilteredEvents) {
          if (ev.year > lastCrossYear && ev.year <= nextYear) {
            if (!bestCrossed || ev.importance >= bestCrossed.importance) {
              bestCrossed = ev;
            }
          }
        }
        if (bestCrossed) {
          setRecentTriggerEventId(bestCrossed.id);
          setTickerEventId(bestCrossed.id);
          setTickerVisible(true);
        }
        lastCrossYear = nextYear;
        setCurrentYear(nextYear);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, cinemaMode, timelineZoom, dimensionFilteredEvents]);

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

  const masteredSet = useMemo(() => new Set(studyData.masteredIds), [studyData.masteredIds]);
  const bookmarkedSet = useMemo(() => new Set(studyData.bookmarkedIds), [studyData.bookmarkedIds]);

  const flyToLocation = useCallback(
    (
      center: [number, number],
      zoom = 3.2,
      opts?: { pitch?: number; duration?: number; exactZoom?: boolean },
    ) => {
      setFlyTarget({
        center,
        zoom,
        exactZoom: opts?.exactZoom,
        pitch: opts?.pitch ?? 0,
        duration: opts?.duration ?? 850,
        nonce: Date.now() + Math.random(),
      });
    },
    [],
  );

  // Cinema Documentary Mode: smooth year progression + tilted camera flight + shockwave + ticker + optional AI narration
  useEffect(() => {
    if (!cinemaMode) {
      setCinemaNarrationStatus('idle');
      setCinemaSubtitle(null);
      return;
    }
    let cancelled = false;
    let rafId = 0;
    let timerId = 0;

    const scopedEra = timelineZoom === 'era' ? currentEraRef.current : null;
    const pool = dimensionFilteredEvents.filter((ev) =>
      scopedEra ? ev.eraId === scopedEra.id : ev.importance === 3,
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

    (async () => {
      for (let i = idx; i < milestones.length && !cancelled; i++) {
        const ev = milestones[i];
        const speed = Math.max(0.5, playSpeedRef.current);
        const travelMs = Math.round(1150 / Math.min(2, speed));
        const evEra = getEraForYear(ev.year);
        const evSub = getSubPeriodForYear(ev.year);

        stopActiveNarration();
        setSelectedFigureId(null);
        setSelectedEventId(ev.id);
        setFocusRouteId(ev.routeIds?.[0] || null);
        setRecentTriggerEventId(ev.id);
        setTickerVisible(true);
        setTickerEventId(ev.id);
        if (window.innerWidth >= 1024) {
          setDesktopCollapsed(false);
        }

        flyToLocation(ev.coords, ev.importance === 3 ? 3.25 : 3.55, {
          pitch: 18,
          duration: travelMs,
        });

        // Pre-fetch narration in parallel with camera flight when AI voice is enabled
        const narrationPromise = cinemaVoiceEnabledRef.current
          ? (async () => {
              setCinemaNarrationStatus('loading');
              setCinemaSubtitle(`${ev.title} — 正在撰写并合成纪录片旁白...`);
              try {
                return await generateNarration({
                  cacheKey: `ev:${ev.id}`,
                  title: ev.title,
                  yearDisplay: ev.dateDisplay,
                  eraName: evEra.name,
                  subPeriodName: evSub.name,
                  regionLabel: REGION_META[ev.region].label,
                  summary: ev.card.summary,
                  politics: ev.card.politics,
                  economy: ev.card.economy,
                  culture: ev.card.culture,
                  consequence: ev.card.consequence,
                });
              } catch (err) {
                if (err instanceof AiClientError) {
                  return {
                    script: `${ev.dateDisplay}，${ev.title}。${ev.card.summary}`,
                    audioBlobUrl: null,
                    ttsFallback: true,
                    usedBrowserFallback: true,
                  };
                }
                return {
                  script: `${ev.dateDisplay}，${ev.title}。${ev.card.summary}`,
                  audioBlobUrl: null,
                  ttsFallback: true,
                  usedBrowserFallback: true,
                };
              }
            })()
          : null;

        await animateYearTo(currentYearRef.current, ev.year, travelMs);
        if (cancelled) break;

        if (cinemaVoiceEnabledRef.current && narrationPromise) {
          const clip = await narrationPromise;
          if (cancelled) break;
          setCinemaSubtitle(clip.script);
          if (clip.audioBlobUrl) {
            setCinemaNarrationStatus('playing');
            await playNarrationClip(clip);
          } else {
            setCinemaNarrationStatus('browser');
            await speakWithBrowserSpeech(clip.script);
          }
          if (cancelled) break;
          await sleep(750);
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
        setCinemaMode(false);
        setRecentTriggerEventId(null);
        const lastEv = milestones[milestones.length - 1];
        if (lastEv) {
          flyToLocation(lastEv.coords, 2.8, { pitch: 0, duration: 750 });
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      stopActiveNarration();
      setCinemaNarrationStatus('idle');
    };
  }, [cinemaMode, timelineZoom, dimensionFilteredEvents, flyToLocation]);

  const applyYearChange = useCallback(
    (yr: number) => {
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
    [selectedEventId, selectedFigureId],
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
    [flyToLocation],
  );

  const handleSelectFigure = useCallback(
    (fig: HistoricalFigure) => {
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
    [flyToLocation],
  );

  const applyStoryStep = useCallback(
    (sl: Storyline, idx: number) => {
      const step = sl.steps[idx];
      if (!step) return;
      const ev = EVENT_MAP[step.eventId];
      if (!ev) return;
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
    [flyToLocation],
  );

  // Storyline auto-advance timer
  useEffect(() => {
    if (!activeStoryline || !storyAutoPlay) return;
    const timer = window.setInterval(() => {
      setStoryStepIdx((prev) => {
        const next = prev + 1;
        if (next >= activeStoryline.steps.length) {
          setStoryAutoPlay(false);
          return prev;
        }
        const step = activeStoryline.steps[next];
        const ev = step ? EVENT_MAP[step.eventId] : null;
        if (ev) {
          setSelectedFigureId(null);
          setSelectedEventId(ev.id);
          setCurrentYear(ev.year);
          setFocusRouteId(step.highlightRouteIds?.[0] || ev.routeIds?.[0] || null);
          flyToLocation(step.center || ev.coords, step.zoom || 3.4);
        }
        return next;
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeStoryline, storyAutoPlay, flyToLocation]);

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
    setStoryboardPlaying(true);
  }, []);

  // Sync map year & camera flight whenever the active AI storyboard scene changes
  useEffect(() => {
    if (!activeStoryboard || activeCountry) return;
    const step = activeStoryboard.steps[storyboardStepIdx];
    if (!step) return;
    setCurrentYear(step.year);
    flyToLocation(step.center, step.zoom, { exactZoom: true, pitch: 18, duration: 1050 });
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
    stopActiveNarration();
    setCardNarratingId(null);
    setCardNarrationLoadingId(null);
    setCardNarrationSubtitle(null);
  }, []);

  const handleNarrateEvent = useCallback(async (ev: HistoryEvent) => {
    setCinemaMode(false);
    stopActiveNarration();
    setCardNarrationLoadingId(ev.id);
    setCardNarratingId(ev.id);
    setCardNarrationSubtitle('正在撰写并合成 AI 历史语音旁白...');
    try {
      const evEra = getEraForYear(ev.year);
      const evSub = getSubPeriodForYear(ev.year);
      const clip = await generateNarration({
        cacheKey: `ev:${ev.id}`,
        title: ev.title,
        yearDisplay: ev.dateDisplay,
        eraName: evEra.name,
        subPeriodName: evSub.name,
        regionLabel: REGION_META[ev.region].label,
        summary: ev.card.summary,
        politics: ev.card.politics,
        economy: ev.card.economy,
        culture: ev.card.culture,
        consequence: ev.card.consequence,
      });
      setCardNarrationLoadingId(null);
      setCardNarrationSubtitle(clip.script);
      await playNarrationClip(clip);
    } catch (err) {
      setCardNarrationLoadingId(null);
      if (
        err instanceof AiClientError &&
        (err.code === 'passcode_invalid' ||
          err.code === 'passcode_unconfigured' ||
          err.code === 'not_configured')
      ) {
        setCardNarratingId(null);
        setCardNarrationSubtitle(null);
        setAiUnlocked(false);
        openAiWithIntent({ tab: 'tutor' });
        return;
      }
      const fallback = `${ev.dateDisplay}，${ev.title}。${ev.card.summary}`;
      setCardNarrationSubtitle(fallback);
      await speakWithBrowserSpeech(fallback);
    }
  }, [openAiWithIntent]);

  const handleNarrateFigure = useCallback(async (fig: HistoricalFigure) => {
    setCinemaMode(false);
    stopActiveNarration();
    setCardNarrationLoadingId(fig.id);
    setCardNarratingId(fig.id);
    setCardNarrationSubtitle('正在撰写并合成人物语音简介...');
    try {
      const figEra = getEraForYear(fig.activeYear);
      const clip = await generateNarration({
        cacheKey: `fig:${fig.id}`,
        title: `${fig.name}（${fig.title}）`,
        yearDisplay: fig.lifespanDisplay,
        eraName: figEra.name,
        regionLabel: REGION_META[fig.region].label,
        summary: fig.card.oneLiner,
        politics: fig.card.eraContext,
        economy: fig.card.coreContributions,
        consequence: fig.card.historicalImpact,
      });
      setCardNarrationLoadingId(null);
      setCardNarrationSubtitle(clip.script);
      await playNarrationClip(clip);
    } catch (err) {
      setCardNarrationLoadingId(null);
      if (
        err instanceof AiClientError &&
        (err.code === 'passcode_invalid' ||
          err.code === 'passcode_unconfigured' ||
          err.code === 'not_configured')
      ) {
        setCardNarratingId(null);
        setCardNarrationSubtitle(null);
        setAiUnlocked(false);
        openAiWithIntent({ tab: 'tutor' });
        return;
      }
      const fallback = `${fig.name}，${fig.title}。${fig.card.oneLiner}`;
      setCardNarrationSubtitle(fallback);
      await speakWithBrowserSpeech(fallback);
    }
  }, [openAiWithIntent]);

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
    [flyToLocation],
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

  // Country Mode stage autoplay
  useEffect(() => {
    if (!activeCountry || !countryPlaying) return;
    const stages = activeCountry.stages;
    if (stages.length === 0) {
      setCountryPlaying(false);
      return;
    }

    const timer = window.setInterval(() => {
      const curIdx = findMatchingStageIndex(stages, currentYearRef.current);
      if (curIdx >= stages.length - 1) {
        setCountryPlaying(false);
        return;
      }
      const nextStage = stages[curIdx + 1];
      if (nextStage) {
        setCurrentYear(nextStage.snapshotYear);
      }
    }, 1900);

    return () => window.clearInterval(timer);
  }, [activeCountry, countryPlaying]);

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
    if (!activeCountry || pulseOpen || storyPickerOpen || searchOpen) return;
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
          masteredCount={studyData.masteredIds.length}
          totalEventsCount={ALL_EVENTS.length + ALL_FIGURES.length}
          onToggleDimension={handleToggleDimension}
          onToggleShowAllEras={() => setShowAllEras((v) => !v)}
          onToggleRoutes={() => setShowRoutes((v) => !v)}
          onToggleFigures={() => setShowFigures((v) => !v)}
          onToggleRelief={() => setShowRelief((v) => !v)}
          onToggleLandmarks={() => setShowLandmarks((v) => !v)}
          onToggleProjection={toggleProjection}
          onToggleTheme={toggleTheme}
          onOpenPulse={() => setPulseOpen(true)}
          onOpenStorylines={() => setStoryPickerOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
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
            masteredIds={masteredSet}
            bookmarkedIds={bookmarkedSet}
            activeRoutes={activeRoutes}
            focusRouteId={focusRouteId}
            showRelief={showRelief}
            showLandmarks={showLandmarks}
            countryFocus={countryFocus}
            isCountryMode={Boolean(activeCountry)}
            aiScene={!activeCountry ? (activeStoryboard?.steps[storyboardStepIdx] ?? null) : null}
            aiStageOpen={aiOpen}
            flyTarget={flyTarget}
            onSelectEvent={(ev) => handleSelectEvent(ev)}
            onSelectFigure={(fig) => handleSelectFigure(fig)}
            onSelectPolity={handleSelectPolity}
            onDeselectEvent={() => {
              setSelectedEventId(null);
              setSelectedFigureId(null);
            }}
          />

          {activeCountry && (
            <CountryMapDock
              country={activeCountry}
              currentYear={currentYear}
              isPlaying={countryPlaying}
              theme={theme}
              onTogglePlay={() => setCountryPlaying((p) => !p)}
              onSelectYear={(yr) => {
                setCountryPlaying(false);
                setCurrentYear(yr);
              }}
            />
          )}

          {!activeCountry && (
            <>
              <ChronicleTicker
                visible={!activeStoryline && tickerVisible}
                cinemaMode={cinemaMode}
                isPlaying={isPlaying}
                currentYear={currentYear}
                currentEra={currentEra}
                currentSubPeriod={currentSubPeriod}
                event={tickerEvent || selectedEvent}
                theme={theme}
                cinemaVoiceEnabled={cinemaVoiceEnabled}
                narrationStatus={cinemaNarrationStatus}
                narrationSubtitle={cinemaSubtitle}
                onToggleCinemaVoice={() => {
                  setCinemaVoiceEnabled((prev) => {
                    const next = !prev;
                    if (!next) {
                      stopActiveNarration();
                      setCinemaNarrationStatus('idle');
                    }
                    return next;
                  });
                }}
                onSelectEvent={(ev) => handleSelectEvent(ev)}
                onStopPlayback={() => {
                  setIsPlaying(false);
                  setCinemaMode(false);
                  setRecentTriggerEventId(null);
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
                  theme={theme}
                  onPrev={() => applyStoryStep(activeStoryline, Math.max(0, storyStepIdx - 1))}
                  onNext={() =>
                    applyStoryStep(
                      activeStoryline,
                      Math.min(activeStoryline.steps.length - 1, storyStepIdx + 1),
                    )
                  }
                  onToggleAuto={() => setStoryAutoPlay((v) => !v)}
                  onExit={() => {
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
                masteredIds={masteredSet}
                bookmarkedIds={bookmarkedSet}
                notes={studyData.notes}
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
                onToggleMastered={toggleMastered}
                onToggleBookmark={toggleBookmark}
                onUpdateNote={setNote}
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
                onCompareTopic={(subject) =>
                  openAiWithIntent({
                    tab: 'compare',
                    compareSubjectA: subject,
                  })
                }
                onNarrateEvent={(ev) => void handleNarrateEvent(ev)}
                onNarrateFigure={(fig) => void handleNarrateFigure(fig)}
                narratingItemId={cardNarratingId}
                narrationLoadingId={cardNarrationLoadingId}
                narrationSubtitle={cardNarrationSubtitle}
                onStopNarration={handleStopCardNarration}
                suppressDesktop={aiOpen}
              />

              {activeStoryboard && (
                <AiStageBar
                  storyboard={activeStoryboard}
                  stepIndex={storyboardStepIdx}
                  isPlaying={storyboardPlaying}
                  theme={theme}
                  aiDrawerOpen={aiOpen}
                  onSelectStep={(idx) => {
                    setStoryboardPlaying(false);
                    setStoryboardStepIdx(idx);
                  }}
                  onPrev={() => {
                    setStoryboardPlaying(false);
                    setStoryboardStepIdx((i) => Math.max(0, i - 1));
                  }}
                  onNext={() => {
                    setStoryboardPlaying(false);
                    setStoryboardStepIdx((i) =>
                      Math.min(activeStoryboard.steps.length - 1, i + 1),
                    );
                  }}
                  onTogglePlay={() => {
                    if (storyboardStepIdx >= activeStoryboard.steps.length - 1 && !storyboardPlaying) {
                      setStoryboardStepIdx(0);
                      setStoryboardPlaying(true);
                    } else {
                      setStoryboardPlaying((p) => !p);
                    }
                  }}
                  onReplay={() => {
                    setStoryboardStepIdx(0);
                    setStoryboardPlaying(true);
                  }}
                  onClose={() => {
                    setStoryboardPlaying(false);
                    setActiveStoryboard(null);
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
            onSelectYear={(yr) => {
              setCountryPlaying(false);
              setCurrentYear(yr);
            }}
            onSelectModernCountry={handleSelectModernCountry}
            onSelectEventInWorld={handleJumpFromCountryToEvent}
            onSelectFigureInWorld={handleJumpFromCountryToFigure}
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
          timelineZoom={timelineZoom}
          theme={theme}
          onChangeYear={applyYearChange}
          onTogglePlay={() => {
            setCinemaMode(false);
            setIsPlaying((p) => {
              const next = !p;
              if (next) setTickerVisible(true);
              return next;
            });
          }}
          onToggleCinemaMode={() => {
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
          onCycleSpeed={() =>
            setPlaySpeed((s) => PLAY_SPEEDS[(PLAY_SPEEDS.indexOf(s) + 1) % PLAY_SPEEDS.length])
          }
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
        masteredIds={masteredSet}
        bookmarkedIds={bookmarkedSet}
        notes={studyData.notes}
        onClose={() => setSearchOpen(false)}
        onSelectEvent={(ev) => handleSelectEvent(ev)}
        onSelectFigure={(fig) => handleSelectFigure(fig)}
        onExportJson={exportJson}
        onImportJson={importJson}
      />

      <AiStudioModal
        open={aiOpen}
        theme={theme}
        context={aiContext}
        masteredIds={masteredSet}
        eraId={currentEra.id}
        intent={aiIntent}
        hasActiveStoryboard={Boolean(activeStoryboard)}
        onPlayStoryboard={handlePlayStoryboard}
        onUnlockChange={setAiUnlocked}
        onClose={() => setAiOpen(false)}
      />
    </div>
  );
}

export default App;
