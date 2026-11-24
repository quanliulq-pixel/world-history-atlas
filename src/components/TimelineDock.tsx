import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { DIMENSION_META, ERAS } from '../data/eras';
import type { Era, HistoryEvent, ThemeMode } from '../types/history';
import {
  formatShortYear,
  formatYear,
  getEraSegments,
  progressToYear,
  yearToProgress,
} from '../utils/timeline';

interface TimelineDockProps {
  currentYear: number;
  currentEra: Era;
  events: HistoryEvent[];
  isPlaying: boolean;
  playSpeed: number;
  theme: ThemeMode;
  onChangeYear: (year: number) => void;
  onTogglePlay: () => void;
  onCycleSpeed: () => void;
  onPrevMilestone: () => void;
  onNextMilestone: () => void;
}

export function TimelineDock({
  currentYear,
  currentEra,
  events,
  isPlaying,
  playSpeed,
  theme,
  onChangeYear,
  onTogglePlay,
  onCycleSpeed,
  onPrevMilestone,
  onNextMilestone,
}: TimelineDockProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const segments = useMemo(() => getEraSegments(), []);
  const currentProgress = yearToProgress(currentYear);

  const eventTicks = useMemo(
    () =>
      events.map((ev) => ({
        id: ev.id,
        progress: yearToProgress(ev.year),
        color:
          theme === 'obsidian'
            ? DIMENSION_META[ev.primaryDimension].darkColor
            : DIMENSION_META[ev.primaryDimension].color,
        importance: ev.importance,
      })),
    [events, theme],
  );

  const scrubToClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      onChangeYear(progressToYear(ratio));
    },
    [onChangeYear],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    scrubToClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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

  return (
    <div
      className="pointer-events-auto relative z-30 border-t px-3 py-2 md:px-4 md:py-2.5 backdrop-blur-md"
      style={{
        backgroundColor:
          theme === 'obsidian' ? 'rgba(20, 30, 43, 0.92)' : 'rgba(251, 248, 241, 0.94)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Controls + Non-linear Scrubber */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrevMilestone}
            className="flex h-8 w-7 items-center justify-center rounded-lg border transition hover:opacity-80 cursor-pointer"
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
            className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#FFFFFF' }}
            title={isPlaying ? '暂停时间演进' : '播放历史演进'}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNextMilestone}
            className="flex h-8 w-7 items-center justify-center rounded-lg border transition hover:opacity-80 cursor-pointer"
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
            className="hidden sm:inline-flex h-8 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="切换播放倍速"
          >
            {playSpeed}×
          </button>
        </div>

        {/* Non-linear Scrubber Track */}
        <div className="relative flex-1 py-2">
          {/* Live bubble during drag */}
          {dragging && (
            <div
              className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold shadow-md"
              style={{
                left: `${currentProgress * 100}%`,
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-surface)',
              }}
            >
              {formatYear(currentYear)}
            </div>
          )}

          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative h-6 cursor-ew-resize touch-none flex items-center"
            role="slider"
            aria-label="历史时间轴"
            aria-valuemin={-3000}
            aria-valuemax={2025}
            aria-valuenow={currentYear}
          >
            {/* Segmented Era Track */}
            <div
              className="relative h-2 w-full overflow-hidden rounded-full flex"
              style={{ backgroundColor: 'var(--bg-muted)' }}
            >
              {segments.map((seg) => (
                <div
                  key={seg.era.id}
                  style={{
                    width: `${seg.era.weight * 100}%`,
                    backgroundColor: seg.era.accentColor,
                    opacity: seg.era.id === currentEra.id ? 0.55 : 0.22,
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
                  height: tick.importance === 3 ? '10px' : '6px',
                  backgroundColor: tick.color,
                  opacity: 0.75,
                }}
              />
            ))}

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

        {/* Year pill at right */}
        <div
          className="hidden md:flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)' }}
        >
          {formatYear(currentYear)}
        </div>
      </div>

      {/* 8-Era Quick Jump Buttons */}
      <div className="no-scrollbar mt-1 flex items-center gap-1 overflow-x-auto">
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
              <span className="hidden lg:inline opacity-75 text-[10px]">
                {formatShortYear(era.startYear)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
