import { ArrowUpRight, Compass, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EVENT_MAP } from '../data/events';
import { WORLD_PULSE_SLICES } from '../data/worldPulse';
import type { HistoryEvent, ThemeMode } from '../types/history';

interface WorldPulseModalProps {
  open: boolean;
  currentYear: number;
  theme: ThemeMode;
  onClose: () => void;
  onJumpToYear: (year: number) => void;
  onSelectEvent: (ev: HistoryEvent) => void;
}

function findNearestSliceId(year: number): string {
  let best = WORLD_PULSE_SLICES[0];
  let bestDist = Math.abs(year - best.year);
  for (const s of WORLD_PULSE_SLICES) {
    const d = Math.abs(year - s.year);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best.id;
}

export function WorldPulseModal({
  open,
  currentYear,
  theme,
  onClose,
  onJumpToYear,
  onSelectEvent,
}: WorldPulseModalProps) {
  const [selectedSliceId, setSelectedSliceId] = useState(() => findNearestSliceId(currentYear));

  useEffect(() => {
    if (open) {
      setSelectedSliceId(findNearestSliceId(currentYear));
    }
  }, [open, currentYear]);

  if (!open) return null;

  const activeSlice =
    WORLD_PULSE_SLICES.find((s) => s.id === selectedSliceId) || WORLD_PULSE_SLICES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(12, 18, 26, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme === 'obsidian' ? '#141E2B' : '#FBF8F1',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 className="text-sm sm:text-base font-bold">同代世界横切 · 全球六大板块同步对照</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                横向打通东亚、南亚、西亚、欧洲、非洲与美洲的同期坐标感
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭同代横切"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slice Year Selector Strip */}
        <div
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2.5"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}
        >
          {WORLD_PULSE_SLICES.map((slice) => {
            const active = slice.id === activeSlice.id;
            return (
              <button
                key={slice.id}
                type="button"
                onClick={() => setSelectedSliceId(slice.id)}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {slice.yearLabel}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="atlas-scroll flex-1 overflow-y-auto p-4 space-y-4">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-sm sm:text-base font-bold">{activeSlice.headline}</h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {activeSlice.globalTheme}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToYear(activeSlice.year);
                onClose();
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent-gold)', color: '#FFFFFF' }}
            >
              <span>看此年份地图</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSlice.regions.map((item) => {
              const spotlight = item.spotlightEventId ? EVENT_MAP[item.spotlightEventId] : null;
              return (
                <div
                  key={item.region}
                  className="flex flex-col justify-between rounded-xl border p-3 space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-bold"
                        style={{
                          backgroundColor: 'var(--bg-muted)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {item.regionLabel}
                      </span>
                      <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.polity}
                      </span>
                    </div>

                    <div className="text-xs leading-relaxed space-y-1">
                      <div>
                        <span className="font-semibold" style={{ color: '#B83B3B' }}>
                          政治：
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.politics}</span>
                      </div>
                      <div>
                        <span className="font-semibold" style={{ color: '#B47417' }}>
                          经济：
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.economy}</span>
                      </div>
                      <div>
                        <span className="font-semibold" style={{ color: '#734B9B' }}>
                          文化：
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.culture}</span>
                      </div>
                    </div>
                  </div>

                  {spotlight && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectEvent(spotlight);
                        onClose();
                      }}
                      className="mt-2 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] font-medium hover:opacity-85 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <span className="truncate">精读：{spotlight.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
