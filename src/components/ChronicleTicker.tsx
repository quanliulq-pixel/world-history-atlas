import { Film, Pause, Sparkles, X } from 'lucide-react';
import { DIMENSION_META, REGION_META } from '../data/eras';
import type { Era, HistoryEvent, SubPeriod, ThemeMode } from '../types/history';
import { formatYear } from '../utils/timeline';

interface ChronicleTickerProps {
  visible: boolean;
  cinemaMode: boolean;
  isPlaying: boolean;
  currentYear: number;
  currentEra: Era;
  currentSubPeriod: SubPeriod;
  event: HistoryEvent | null;
  theme: ThemeMode;
  onSelectEvent: (ev: HistoryEvent) => void;
  onStopPlayback: () => void;
  onDismiss: () => void;
}

export function ChronicleTicker({
  visible,
  cinemaMode,
  isPlaying,
  currentYear,
  currentEra,
  currentSubPeriod,
  event,
  theme,
  onSelectEvent,
  onStopPlayback,
  onDismiss,
}: ChronicleTickerProps) {
  if (!visible) return null;

  const activeMode = cinemaMode || isPlaying;
  const accent = event
    ? theme === 'obsidian'
      ? DIMENSION_META[event.primaryDimension].darkColor
      : DIMENSION_META[event.primaryDimension].color
    : currentEra.accentColor;

  return (
    <div
      className="atlas-ticker-enter pointer-events-auto absolute left-3 md:left-16 right-3 lg:right-auto lg:left-[calc(50%-210px)] lg:-translate-x-1/2 lg:w-[540px] max-w-full top-3 z-20 rounded-2xl border px-3.5 py-2.5 shadow-xl backdrop-blur-md"
      style={{
        backgroundColor:
          theme === 'obsidian' ? 'rgba(18, 28, 40, 0.92)' : 'rgba(251, 248, 241, 0.94)',
        borderColor: accent,
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: accent }}
          >
            {cinemaMode ? <Film className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            <span>{cinemaMode ? '电影编年演进' : isPlaying ? '历史进程实况' : '编年快报'}</span>
          </span>

          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium truncate max-w-[160px]"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          >
            {currentEra.shortName} · {currentSubPeriod.name}
          </span>

          <span
            className="text-xs sm:text-sm font-bold tabular-nums"
            style={{ color: accent }}
          >
            {formatYear(currentYear)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeMode && (
            <button
              type="button"
              onClick={onStopPlayback}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
              title="暂停演进"
            >
              <Pause className="h-3 w-3" />
              <span>暂停</span>
            </button>
          )}

          {!activeMode && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-1 hover:opacity-75 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              aria-label="关闭编年提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {event ? (
        <button
          type="button"
          onClick={() => onSelectEvent(event)}
          className="mt-1.5 w-full text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs sm:text-[13px] font-bold group-hover:underline">
              {event.title}
            </span>
            <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {REGION_META[event.region].label}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {event.card.summary}
          </p>
        </button>
      ) : (
        <p className="mt-1.5 line-clamp-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {currentSubPeriod.themeSummary}
        </p>
      )}
    </div>
  );
}
