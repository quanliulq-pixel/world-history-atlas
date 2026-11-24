import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChronicleTicker } from './components/ChronicleTicker';
import { EventCardPanel } from './components/EventCardPanel';
import { SearchAndProgressModal } from './components/SearchAndProgressModal';
import { StorylinePickerModal, StorylinePlayerBar } from './components/StorylineOverlay';
import { TimelineDock } from './components/TimelineDock';
import { TopBar } from './components/TopBar';
import { WorldMap, type VisibleEventItem, type VisibleFigureItem } from './components/WorldMap';
import { WorldPulseModal } from './components/WorldPulseModal';
import { MAX_YEAR, MIN_YEAR } from './data/eras';
import { ALL_EVENTS, EVENT_MAP } from './data/events';
import { ALL_FIGURES, FIGURE_MAP } from './data/figures';
import { HISTORICAL_ROUTES } from './data/routes';
import { useStudyStore } from './hooks/useStudyStore';
import type { Dimension, HistoricalFigure, HistoryEvent, SnapshotMeta, Storyline } from './types/history';
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
    pitch?: number;
    duration?: number;
    nonce: number;
  } | null>(null);

  const [pulseOpen, setPulseOpen] = useState(false);
  const [storyPickerOpen, setStoryPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [activeStoryline, setActiveStoryline] = useState<Storyline | null>(null);
  const [storyStepIdx, setStoryStepIdx] = useState(0);
  const [storyAutoPlay, setStoryAutoPlay] = useState(false);

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

  // Load static physical atlas & snapshot manifest once on mount
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
      opts?: { pitch?: number; duration?: number },
    ) => {
      setFlyTarget({
        center,
        zoom,
        pitch: opts?.pitch ?? 0,
        duration: opts?.duration ?? 850,
        nonce: Date.now() + Math.random(),
      });
    },
    [],
  );

  // Cinema Documentary Mode: smooth year progression + tilted camera flight + shockwave + ticker
  useEffect(() => {
    if (!cinemaMode) return;
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
        const start = performance.now();
        const step = (now: number) => {
          if (cancelled) {
            resolve();
            return;
          }
          const rawT = Math.min(1, (now - start) / durationMs);
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

        setRecentTriggerEventId(null);
        setSelectedFigureId(null);
        setTickerVisible(true);
        setTickerEventId(ev.id);

        flyToLocation(ev.coords, ev.importance === 3 ? 3.25 : 3.55, {
          pitch: 18,
          duration: travelMs,
        });

        await animateYearTo(currentYearRef.current, ev.year, travelMs);
        if (cancelled) break;

        setSelectedEventId(ev.id);
        setFocusRouteId(ev.routeIds?.[0] || null);
        setRecentTriggerEventId(ev.id);
        setTickerEventId(ev.id);
        if (window.innerWidth >= 1024) {
          setDesktopCollapsed(false);
        }

        const holdMs = Math.max(1400, Math.round(3500 / speed));
        await sleep(holdMs);
      }

      if (!cancelled) {
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

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <TopBar
        currentYear={currentYear}
        currentEra={currentEra}
        currentSubPeriod={currentSubPeriod}
        snapshotYear={activeSnapshot?.year ?? null}
        selectedDimensions={selectedDimensions}
        showAllEras={showAllEras}
        showRoutes={showRoutes}
        showFigures={showFigures}
        projection={projection}
        theme={theme}
        masteredCount={studyData.masteredIds.length}
        totalEventsCount={ALL_EVENTS.length + ALL_FIGURES.length}
        onToggleDimension={handleToggleDimension}
        onToggleShowAllEras={() => setShowAllEras((v) => !v)}
        onToggleRoutes={() => setShowRoutes((v) => !v)}
        onToggleFigures={() => setShowFigures((v) => !v)}
        onToggleProjection={toggleProjection}
        onToggleTheme={toggleTheme}
        onOpenPulse={() => setPulseOpen(true)}
        onOpenStorylines={() => setStoryPickerOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <main className="relative flex-1 overflow-hidden">
        <WorldMap
          theme={theme}
          projection={projection}
          currentYear={currentYear}
          isPlaying={isPlaying || cinemaMode}
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
          flyTarget={flyTarget}
          onSelectEvent={(ev) => handleSelectEvent(ev)}
          onSelectFigure={(fig) => handleSelectFigure(fig)}
          onDeselectEvent={() => {
            setSelectedEventId(null);
            setSelectedFigureId(null);
          }}
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
          onSelectEvent={(ev) => handleSelectEvent(ev)}
          onStopPlayback={() => {
            setIsPlaying(false);
            setCinemaMode(false);
            setRecentTriggerEventId(null);
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
        />
      </main>

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
    </div>
  );
}

export default App;
