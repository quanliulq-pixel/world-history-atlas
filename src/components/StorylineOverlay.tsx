import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { EVENT_MAP } from '../data/events';
import { STORYLINES } from '../data/storylines';
import type { Storyline, ThemeMode } from '../types/history';

interface StorylineModalProps {
  open: boolean;
  theme: ThemeMode;
  onClose: () => void;
  onStartStoryline: (storyline: Storyline) => void;
}

export function StorylinePickerModal({
  open,
  theme,
  onClose,
  onStartStoryline,
}: StorylineModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(12, 18, 26, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme === 'obsidian' ? '#141E2B' : '#FBF8F1',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 className="text-sm sm:text-base font-bold">专题导览 · 跨世纪逻辑主线</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                像看互动纪录片一样，跟随镜头与因果连线串起世界史核心脉络
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭专题选择"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="atlas-scroll flex-1 overflow-y-auto p-4 space-y-3">
          {STORYLINES.map((sl, index) => (
            <div
              key={sl.id}
              className="rounded-xl border p-3.5 transition hover:shadow-md"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                borderLeft: `4px solid ${sl.accentColor}`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: sl.accentColor }}
                    >
                      专题 {index + 1} · {sl.yearSpan}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      共 {sl.steps.length} 站
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm sm:text-base font-bold">{sl.title}</h3>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {sl.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onStartStoryline(sl);
                    onClose();
                  }}
                  className="shrink-0 inline-flex items-center justify-center gap-1 rounded-lg px-3.5 py-2 text-xs font-semibold text-white cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: sl.accentColor }}
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>开始导览</span>
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {sl.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StorylinePlayerProps {
  storyline: Storyline;
  stepIndex: number;
  autoPlaying: boolean;
  theme: ThemeMode;
  onPrev: () => void;
  onNext: () => void;
  onToggleAuto: () => void;
  onExit: () => void;
  onExpandCard: () => void;
}

export function StorylinePlayerBar({
  storyline,
  stepIndex,
  autoPlaying,
  theme,
  onPrev,
  onNext,
  onToggleAuto,
  onExit,
  onExpandCard,
}: StorylinePlayerProps) {
  const step = storyline.steps[stepIndex];
  const event = step ? EVENT_MAP[step.eventId] : null;
  if (!step || !event) return null;

  return (
    <div
      className="pointer-events-auto absolute left-3 md:left-14 right-3 lg:right-auto lg:w-[440px] top-3 z-20 rounded-2xl border p-3 shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor:
          theme === 'obsidian' ? 'rgba(20, 30, 43, 0.94)' : 'rgba(251, 248, 241, 0.95)',
        borderColor: storyline.accentColor,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: storyline.accentColor }}
          >
            导览 {stepIndex + 1}/{storyline.steps.length}
          </span>
          <span className="truncate text-xs font-bold">{storyline.title}</span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-md p-1 hover:opacity-75 cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="退出导览"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step progress dots */}
      <div className="mt-2 flex items-center gap-1">
        {storyline.steps.map((s, idx) => (
          <div
            key={s.eventId}
            className="h-1 flex-1 rounded-full transition-all"
            style={{
              backgroundColor:
                idx <= stepIndex ? storyline.accentColor : 'var(--border-subtle)',
            }}
          />
        ))}
      </div>

      <div className="mt-2">
        <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          {event.dateDisplay} · {event.title}
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {step.narrative}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-0.5 rounded-lg border px-2 py-1 text-xs disabled:opacity-40 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>上一步</span>
          </button>

          <button
            type="button"
            onClick={onToggleAuto}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
            style={{ backgroundColor: storyline.accentColor }}
          >
            {autoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{autoPlaying ? '暂停' : '自动'}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={stepIndex >= storyline.steps.length - 1}
            className="inline-flex items-center gap-0.5 rounded-lg border px-2 py-1 text-xs disabled:opacity-40 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <span>下一步</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onExpandCard}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer hover:opacity-85"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--accent-primary)',
          }}
        >
          <FileText className="h-3 w-3" />
          <span>精读卡片</span>
        </button>
      </div>
    </div>
  );
}
