import { ChevronLeft, ChevronRight, Film, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { DIMENSION_META, ERAS, MAX_YEAR, MIN_YEAR } from '../data/eras';
import type { Era, HistoryEvent, SnapshotMeta, SubPeriod, ThemeMode } from '../types/history';
import {
  eraProgressToYear,
  eraYearToProgress,
  formatShortYear,
  formatYear,
  generateRulerTicks,
  getEraSegments,
  progressToYear,
  yearToProgress,
} from '../utils/timeline';

interface TimelineDockProps {
  currentYear: number;
  currentEra: Era;
  currentSubPeriod: SubPeriod;
  events: HistoryEvent[];
  snapshots: SnapshotMeta[];
  activeSnapshotYear: number | null;
  isPlaying: boolean;
  cinemaMode: boolean;
  playSpeed: number;
  timelineZoom: 'global' | 'era';
  theme: ThemeMode;
  onChangeYear: (year: number) => void;
  onTogglePlay: () => void;
  onToggleCinemaMode: () => void;
  onCycleSpeed: () => void;
  onToggleTimelineZoom: () => void;
  onPrevMilestone: () => void;
  onNextMilestone: () => void;
  onStepSnapshot: (direction: -1 | 1) => void;
}

export function TimelineDock({
  currentYear,
  currentEra,
  currentSubPeriod,
  events,
  snapshots,
  activeSnapshotYear,
  isPlaying,
  cinemaMode,
  playSpeed,
  timelineZoom,
  theme,
  onChangeYear,
  onTogglePlay,
  onToggleCinemaMode,
  onCycleSpeed,
  onToggleTimelineZoom,
  onPrevMilestone,
  onNextMilestone,
  onStepSnapshot,
}: TimelineDockProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearInputVal, setYearInputVal] = useState(String(currentYear));

  const segments = useMemo(() => getEraSegments(), []);

  const toProgress = useCallback(
    (y: number) =>
      timelineZoom === 'era' ? eraYearToProgress(y, currentEra) : yearToProgress(y),
    [timelineZoom, currentEra],
  );

  const fromProgress = useCallback(
    (p: number) =>
      timelineZoom === 'era' ? eraProgressToYear(p, currentEra) : progressToYear(p),
    [timelineZoom, currentEra],
  );

  const currentProgress = toProgress(currentYear);

  const subPeriodBands = useMemo(() => {
    if (timelineZoom !== 'era') return [];
    const span = Math.max(1, currentEra.endYear - currentEra.startYear);
    return currentEra.subPeriods.map((sp, idx) => ({
      sp,
      widthPct: ((sp.endYear - sp.startYear) / span) * 100,
      opacity:
        sp.id === currentSubPeriod.id ? 0.52 : idx % 2 === 0 ? 0.24 : 0.16,
    }));
  }, [timelineZoom, currentEra, currentSubPeriod.id]);

  const rulerTicks = useMemo(
    () => generateRulerTicks(timelineZoom === 'era' ? currentEra : null),
    [timelineZoom, currentEra],
  );

  const snapshotTicks = useMemo(() => {
    return snapshots
      .filter((s) =>
        timelineZoom === 'global'
          ? true
          : s.year >= currentEra.startYear && s.year <= currentEra.endYear,
      )
      .map((s) => ({
        year: s.year,
        progress: toProgress(s.year),
        isCurrent: s.year === activeSnapshotYear,
      }));
  }, [snapshots, timelineZoom, currentEra, activeSnapshotYear, toProgress]);

  const eventTicks = useMemo(() => {
    return events
      .filter((ev) =>
        timelineZoom === 'global'
          ? true
          : ev.year >= currentEra.startYear && ev.year <= currentEra.endYear,
      )
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        year: ev.year,
        progress: toProgress(ev.year),
        color:
          theme === 'obsidian'
            ? DIMENSION_META[ev.primaryDimension].darkColor
            : DIMENSION_META[ev.primaryDimension].color,
        importance: ev.importance,
      }));
  }, [events, theme, timelineZoom, currentEra, toProgress]);

  const previewInfo = useMemo(() => {
    const p = dragging ? currentProgress : hoverProgress;
    if (p === null) return null;
    const yr = dragging ? currentYear : fromProgress(p);
    let nearTitle: string | null = null;
    let bestDist = 0.022;
    for (const tk of eventTicks) {
      const d = Math.abs(tk.progress - p);
      if (d < bestDist) {
        bestDist = d;
        nearTitle = tk.title;
      }
    }
    return { progress: p, year: yr, nearTitle };
  }, [dragging, hoverProgress, currentProgress, currentYear, fromProgress, eventTicks]);

  const computeRatioFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  }, []);

  const scrubToClientX = useCallback(
    (clientX: number) => {
      const ratio = computeRatioFromClientX(clientX);
      if (ratio === null) return;
      onChangeYear(fromProgress(ratio));
    },
    [computeRatioFromClientX, fromProgress, onChangeYear],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    scrubToClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = computeRatioFromClientX(e.clientX);
    if (ratio !== null) setHoverProgress(ratio);
    if (!dragging) return;
    scrubToClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const commitYearEdit = () => {
    setEditingYear(false);
    const parsed = Number.parseInt(yearInputVal.trim(), 10);
    if (!Number.isNaN(parsed)) {
      onChangeYear(Math.max(MIN_YEAR, Math.min(MAX_YEAR, parsed)));
    }
  };

  return (
    <div
      className="pointer-events-auto relative z-30 border-t px-3 py-1.5 md:px-4 md:py-2 backdrop-blur-md"
      style={{
        backgroundColor:
          theme === 'obsidian' ? 'rgba(20, 30, 43, 0.92)' : 'rgba(251, 248, 241, 0.94)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Row 1: Playback Controls + Precision Ruler Scrubber + Step/Snapshot Controls */}
      <div className="flex items-center gap-1.5 md:gap-2.5">
        {/* Playback & Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrevMilestone}
            className="flex h-7 w-6 sm:h-8 sm:w-7 items-center justify-center rounded-lg border transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="上一件大事"
            aria-label="上一件大事"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg shadow-sm transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: isPlaying ? '#B47417' : 'var(--accent-primary)',
              color: '#FFFFFF',
            }}
            title={isPlaying ? '暂停时间演进' : '连续播放历史演进'}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onToggleCinemaMode}
            className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: cinemaMode ? '#9E3434' : 'var(--bg-surface)',
              borderColor: cinemaMode ? '#9E3434' : 'var(--border-strong)',
              color: cinemaMode ? '#FFFFFF' : 'var(--text-primary)',
            }}
            title="开启/停止电影编年模式：自动飞镜并配对大事冲击波与疆域渐变"
            aria-label="电影演示"
          >
            <Film className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{cinemaMode ? '停止演示' : '电影演示'}</span>
          </button>

          <button
            type="button"
            onClick={onNextMilestone}
            className="flex h-7 w-6 sm:h-8 sm:w-7 items-center justify-center rounded-lg border transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="下一件大事"
            aria-label="下一件大事"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onCycleSpeed}
            className="hidden sm:inline-flex h-8 items-center justify-center rounded-lg border px-1.5 text-[11px] font-semibold transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="切换播放倍速 (0.5x / 1x / 2x / 4x)"
          >
            {playSpeed}×
          </button>

          <button
            type="button"
            onClick={onToggleTimelineZoom}
            className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-lg border px-1.5 sm:px-2 text-[11px] font-medium transition hover:opacity-85 cursor-pointer"
            style={{
              backgroundColor:
                timelineZoom === 'era' ? `${currentEra.accentColor}22` : 'var(--bg-surface)',
              borderColor:
                timelineZoom === 'era' ? currentEra.accentColor : 'var(--border-subtle)',
              color: timelineZoom === 'era' ? currentEra.accentColor : 'var(--text-secondary)',
            }}
            title={
              timelineZoom === 'era'
                ? '当前聚焦本时代刻度，点击返回全史视图'
                : '将时间标尺放大至当前时代（精细调节年表与截面）'
            }
          >
            {timelineZoom === 'era' ? (
              <ZoomOut className="h-3.5 w-3.5" />
            ) : (
              <ZoomIn className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">
              {timelineZoom === 'era' ? '全史视图' : '聚焦本时代'}
            </span>
          </button>
        </div>

        {/* Non-linear or Era-Zoomed Ruler Track */}
        <div className="relative flex-1 py-2 sm:mb-2">
          {/* Live bubble during hover or drag */}
          {previewInfo && (
            <div
              className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-md z-20"
              style={{
                left: `${Math.max(8, Math.min(92, previewInfo.progress * 100))}%`,
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-surface)',
              }}
            >
              {formatYear(previewInfo.year)}
              {previewInfo.nearTitle ? ` · ${previewInfo.nearTitle.slice(0, 12)}` : ''}
            </div>
          )}

          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setHoverProgress(null)}
            className="relative h-6 cursor-ew-resize touch-none flex items-center"
            role="slider"
            aria-label="历史时间轴"
            aria-valuemin={timelineZoom === 'era' ? currentEra.startYear : MIN_YEAR}
            aria-valuemax={timelineZoom === 'era' ? currentEra.endYear : MAX_YEAR}
            aria-valuenow={currentYear}
          >
            {/* Track Bands: either 8 Macro Eras or 3 Sub-Periods of currentEra */}
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full flex"
              style={{ backgroundColor: 'var(--bg-muted)' }}
            >
              {timelineZoom === 'global'
                ? segments.map((seg) => (
                    <div
                      key={seg.era.id}
                      style={{
                        width: `${seg.era.weight * 100}%`,
                        backgroundColor: seg.era.accentColor,
                        opacity: seg.era.id === currentEra.id ? 0.58 : 0.22,
                        borderRight: '1px solid var(--bg-surface)',
                      }}
                    />
                  ))
                : subPeriodBands.map((band) => (
                    <div
                      key={band.sp.id}
                      style={{
                        width: `${band.widthPct}%`,
                        backgroundColor: currentEra.accentColor,
                        opacity: band.opacity,
                        borderRight: '1px solid var(--bg-surface)',
                      }}
                    />
                  ))}

              {/* Active Progress Fill */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0"
                style={{
                  width: `${currentProgress * 100}%`,
                  backgroundColor: currentEra.accentColor,
                  opacity: 0.72,
                }}
              />
            </div>

            {/* Event Ticks */}
            {eventTicks.map((tick) => (
              <span
                key={tick.id}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${tick.progress * 100}%`,
                  width: tick.importance === 3 ? '3px' : '2px',
                  height: tick.importance === 3 ? '11px' : '7px',
                  backgroundColor: tick.color,
                  opacity: 0.78,
                }}
              />
            ))}

            {/* Snapshot Boundary Diamonds */}
            {snapshotTicks.map((st) => (
              <span
                key={st.year}
                className="pointer-events-none absolute -top-0.5 -translate-x-1/2 rotate-45"
                style={{
                  left: `${st.progress * 100}%`,
                  width: st.isCurrent ? '6px' : '4px',
                  height: st.isCurrent ? '6px' : '4px',
                  backgroundColor: st.isCurrent ? currentEra.accentColor : 'var(--text-muted)',
                  opacity: st.isCurrent ? 1 : 0.55,
                }}
              />
            ))}

            {/* Precision Ruler Labels below track on sm+ */}
            <div className="pointer-events-none hidden sm:block absolute inset-x-0 -bottom-3 h-3">
              {rulerTicks.map((rt) => (
                <span
                  key={rt.year}
                  className="absolute -translate-x-1/2 text-[9px] tabular-nums leading-none"
                  style={{
                    left: `${rt.progress * 100}%`,
                    color: 'var(--text-muted)',
                    opacity: rt.major ? 0.85 : 0.55,
                  }}
                >
                  {rt.label}
                </span>
              ))}
            </div>

            {/* Thumb Handle */}
            <div
              className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full shadow-md transition-transform"
              style={{
                left: `${currentProgress * 100}%`,
                backgroundColor: '#FFFFFF',
                border: `3px solid ${currentEra.accentColor}`,
                transform: dragging ? 'translate(-50%, -50%) scale(1.25)' : 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>

        {/* Fine Year Stepping & Snapshot Stepping */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onChangeYear(currentYear - 10)}
            className="hidden xl:inline-flex h-7 items-center rounded-md border px-1.5 text-[10px] font-medium hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="后退 10 年"
          >
            -10
          </button>

          <button
            type="button"
            onClick={() => onChangeYear(currentYear - 1)}
            className="inline-flex h-7 items-center rounded-md border px-1.5 text-[10px] font-medium hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="后退 1 年"
          >
            -1年
          </button>

          {editingYear ? (
            <input
              type="number"
              min={MIN_YEAR}
              max={MAX_YEAR}
              autoFocus
              value={yearInputVal}
              onChange={(e) => setYearInputVal(e.target.value)}
              onBlur={commitYearEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitYearEdit();
                if (e.key === 'Escape') setEditingYear(false);
              }}
              className="h-7 w-20 rounded-md border px-1.5 text-center text-xs font-bold focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: currentEra.accentColor,
                color: 'var(--text-primary)',
              }}
              aria-label="直接输入公元年份（负数为公元前）"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setYearInputVal(String(currentYear));
                setEditingYear(true);
              }}
              className="inline-flex h-7 items-center rounded-md px-2 text-xs font-bold tabular-nums hover:opacity-85 cursor-pointer"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)' }}
              title="点击直接输入任意年份（如 -221 或 1949）"
            >
              {formatYear(currentYear)}
            </button>
          )}

          <button
            type="button"
            onClick={() => onChangeYear(currentYear + 1)}
            className="inline-flex h-7 items-center rounded-md border px-1.5 text-[10px] font-medium hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="前进 1 年"
          >
            +1年
          </button>

          <button
            type="button"
            onClick={() => onChangeYear(currentYear + 10)}
            className="hidden xl:inline-flex h-7 items-center rounded-md border px-1.5 text-[10px] font-medium hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="前进 10 年"
          >
            +10
          </button>

          {activeSnapshotYear !== null && (
            <div
              className="hidden lg:flex items-center rounded-md border overflow-hidden ml-0.5"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
            >
              <button
                type="button"
                onClick={() => onStepSnapshot(-1)}
                className="px-1.5 py-1 text-[10px] hover:opacity-75 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                title="切换上一期历史疆域截面"
                aria-label="上一疆域截面"
              >
                ‹
              </button>
              <span
                className="px-1 text-[10px] font-medium tabular-nums"
                style={{ color: 'var(--text-muted)' }}
                title="50 期疆域截面步进"
              >
                截面 {formatShortYear(activeSnapshotYear)}
              </span>
              <button
                type="button"
                onClick={() => onStepSnapshot(1)}
                className="px-1.5 py-1 text-[10px] hover:opacity-75 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                title="切换下一期历史疆域截面"
                aria-label="下一疆域截面"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: 8 Macro Eras + 3 Sub-Periods of Current Era */}
      <div className="no-scrollbar mt-1.5 sm:mt-2 flex items-center gap-1 overflow-x-auto">
        {ERAS.map((era) => {
          const isCurrent = era.id === currentEra.id;
          return (
            <button
              key={era.id}
              type="button"
              onClick={() =>
                onChangeYear(
                  era.id === 'era-1'
                    ? -2500
                    : Math.round(era.startYear + (era.endYear - era.startYear) * 0.2),
                )
              }
              className="shrink-0 flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] transition cursor-pointer"
              style={{
                backgroundColor: isCurrent ? era.accentColor : 'transparent',
                color: isCurrent ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              <span>{era.shortName}</span>
              <span className="hidden xl:inline opacity-75 text-[10px]">
                {formatShortYear(era.startYear)}
              </span>
            </button>
          );
        })}

        <div
          className="mx-1 h-3.5 w-px shrink-0"
          style={{ backgroundColor: 'var(--border-subtle)' }}
        />

        {currentEra.subPeriods.map((sp) => {
          const isActiveSp = sp.id === currentSubPeriod.id;
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() =>
                onChangeYear(Math.round(sp.startYear + (sp.endYear - sp.startYear) * 0.35))
              }
              className="shrink-0 rounded-md border px-2 py-0.5 text-[10px] transition cursor-pointer"
              style={{
                backgroundColor: isActiveSp ? `${currentEra.accentColor}1E` : 'var(--bg-surface)',
                borderColor: isActiveSp ? currentEra.accentColor : 'var(--border-subtle)',
                color: isActiveSp ? currentEra.accentColor : 'var(--text-muted)',
                fontWeight: isActiveSp ? 600 : 400,
              }}
              title={`${formatYear(sp.startYear)} — ${formatYear(sp.endYear)}：${sp.themeSummary}`}
            >
              {sp.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
