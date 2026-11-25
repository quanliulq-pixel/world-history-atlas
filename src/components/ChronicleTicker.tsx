import { Film, Loader2, Pause, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { DIMENSION_META, REGION_META } from '../data/eras';
import type { Era, HistoryEvent, SubPeriod, ThemeMode } from '../types/history';
import type { AiDocumentaryBeat } from '../utils/aiClient';
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
  cinemaVoiceEnabled?: boolean;
  narrationStatus?: 'idle' | 'loading' | 'playing' | 'browser';
  narrationSubtitle?: string | null;
  narrationBeats?: AiDocumentaryBeat[] | null;
  activeBeatIndex?: number;
  onToggleCinemaVoice?: () => void;
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
  cinemaVoiceEnabled = true,
  narrationStatus = 'idle',
  narrationSubtitle = null,
  narrationBeats = null,
  activeBeatIndex = 0,
  onToggleCinemaVoice,
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
          {cinemaMode && onToggleCinemaVoice && (
            <button
              type="button"
              onClick={onToggleCinemaVoice}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: cinemaVoiceEnabled ? 'rgba(180, 116, 23, 0.16)' : 'var(--bg-surface)',
                borderColor: cinemaVoiceEnabled ? '#B47417' : 'var(--border-subtle)',
                color: cinemaVoiceEnabled ? (theme === 'obsidian' ? '#E5A94C' : '#9B5E0B') : 'var(--text-muted)',
              }}
              title="开启或关闭电影模式 AI 语音旁白"
            >
              {narrationStatus === 'loading' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : cinemaVoiceEnabled ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
              <span>{cinemaVoiceEnabled ? 'AI 旁白' : '静音'}</span>
            </button>
          )}

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

      {cinemaMode && cinemaVoiceEnabled && ((narrationBeats && narrationBeats.length > 0) || narrationSubtitle) && (
        <div
          className="mt-2 rounded-xl border px-2.5 py-2 text-[11px] leading-relaxed space-y-1.5"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {narrationBeats && narrationBeats.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold mr-1" style={{ color: accent }}>
                  <span className="inline-flex items-end gap-[2px] h-2.5" aria-hidden="true">
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
                    <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
                  </span>
                  <span>纪录片分镜演播</span>
                </span>
                {narrationBeats.map((b, idx) => {
                  const isAct = idx === activeBeatIndex;
                  return (
                    <span
                      key={`${b.title}-${idx}`}
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold border transition-colors"
                      style={{
                        backgroundColor: isAct ? accent : 'var(--bg-surface)',
                        borderColor: isAct ? accent : 'var(--border-subtle)',
                        color: isAct ? '#FFFFFF' : 'var(--text-muted)',
                      }}
                    >
                      <span>{idx + 1}.</span>
                      <span>{b.title}</span>
                    </span>
                  );
                })}
              </div>

              <div className="leading-relaxed">
                {narrationBeats.map((b, idx) => {
                  const isAct = idx === activeBeatIndex;
                  return (
                    <span
                      key={`n-${idx}`}
                      className={
                        isAct
                          ? 'rounded-sm px-0.5 py-[1px] font-medium transition-colors'
                          : 'opacity-60 transition-opacity'
                      }
                      style={
                        isAct
                          ? {
                              backgroundColor:
                                theme === 'obsidian'
                                  ? 'rgba(224, 166, 75, 0.24)'
                                  : 'rgba(180, 116, 23, 0.18)',
                              color: 'var(--text-primary)',
                            }
                          : undefined
                      }
                    >
                      {b.narration}
                      {idx < narrationBeats.length - 1 ? ' ' : ''}
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <div>
              <span className="font-semibold" style={{ color: accent }}>
                {narrationStatus === 'loading'
                  ? '🎙 正在合成解说：'
                  : narrationStatus === 'browser'
                    ? '🎙 旁白（浏览器语音）：'
                    : '🎙 AI 纪录片旁白：'}
              </span>
              {narrationSubtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
