import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import type { ThemeMode } from '../types/history';
import type { AiStoryboard } from '../utils/aiClient';
import { formatYear } from '../utils/timeline';

interface AiStageBarProps {
  storyboard: AiStoryboard;
  stepIndex: number;
  isPlaying: boolean;
  theme: ThemeMode;
  aiDrawerOpen: boolean;
  onSelectStep: (idx: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onReplay: () => void;
  onClose: () => void;
  onOpenAiDrawer: () => void;
}

export function AiStageBar({
  storyboard,
  stepIndex,
  isPlaying,
  theme,
  aiDrawerOpen,
  onSelectStep,
  onPrev,
  onNext,
  onTogglePlay,
  onReplay,
  onClose,
  onOpenAiDrawer,
}: AiStageBarProps) {
  const steps = storyboard.steps;
  const currentStep = steps[stepIndex] || steps[0];
  if (!currentStep) return null;

  const isDark = theme === 'obsidian';

  return (
    <div
      className={`pointer-events-auto fixed left-3 right-3 bottom-4 z-30 rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-all ${
        aiDrawerOpen
          ? 'lg:left-14 lg:right-[488px]'
          : 'lg:left-1/2 lg:-translate-x-1/2 lg:w-[760px] lg:max-w-[90vw]'
      }`}
      style={{
        backgroundColor: isDark ? 'rgba(18, 28, 40, 0.92)' : 'rgba(251, 248, 241, 0.95)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Director Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Sparkles className="h-3 w-3" />
            <span>
              AI 动态演播 · {stepIndex + 1}/{steps.length}
            </span>
          </span>

          <span className="truncate text-xs font-bold">{storyboard.title}</span>

          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums shrink-0"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--accent-primary)' }}
          >
            {formatYear(currentStep.year)}
          </span>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!aiDrawerOpen && (
            <button
              type="button"
              onClick={onOpenAiDrawer}
              className="lg:hidden inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold cursor-pointer"
              style={{
                backgroundColor: 'rgba(180, 116, 23, 0.14)',
                borderColor: '#B47417',
                color: isDark ? '#E5A94C' : '#9B5E0B',
              }}
            >
              <span>返回 AI 问答</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex <= 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border hover:opacity-80 disabled:opacity-35 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            aria-label="上一幕"
            title="上一幕"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isPlaying ? '暂停' : '播放'}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={stepIndex >= steps.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg border hover:opacity-80 disabled:opacity-35 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            aria-label="下一幕"
            title="下一幕"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onReplay}
            className="flex h-7 w-7 items-center justify-center rounded-lg border hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            aria-label="从头重播"
            title="从头重播动画"
          >
            <RotateCcw className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="退出 AI 动画舞台"
            title="退出动画"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Caption & Live Flow Summary */}
      <div className="mt-2">
        <div className="text-xs font-bold">{currentStep.title}</div>
        <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {currentStep.caption}
        </p>
      </div>

      {/* Clickable Scene Progress Bar */}
      <div className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {steps.map((st, idx) => {
          const active = idx === stepIndex;
          return (
            <button
              key={`${st.title}-${idx}`}
              type="button"
              onClick={() => onSelectStep(idx)}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold transition cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-surface)',
                borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: active ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              <span className="opacity-80">{idx + 1}.</span>
              <span>{st.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
