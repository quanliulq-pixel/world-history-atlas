import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '../types/history';
import type { AiStoryboard } from '../utils/aiClient';
import { formatYear } from '../utils/timeline';

const AI_STAGE_POS_KEY = 'world-history-atlas:aistage-pos:v1';

interface AiStageBarProps {
  storyboard: AiStoryboard;
  stepIndex: number;
  isPlaying: boolean;
  voiceSynced?: boolean;
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
  voiceSynced = false,
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
  const barRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(AI_STAGE_POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as { x?: number; y?: number };
      return typeof p.x === 'number' && typeof p.y === 'number' ? { x: p.x, y: p.y } : null;
    } catch {
      return null;
    }
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);

  const clamp = useCallback((x: number, y: number) => {
    const el = barRef.current;
    const w = el?.offsetWidth ?? 560;
    const h = el?.offsetHeight ?? 140;
    return {
      x: Math.round(Math.max(8, Math.min(Math.max(8, window.innerWidth - w - 8), x))),
      y: Math.round(Math.max(8, Math.min(Math.max(8, window.innerHeight - h - 8), y))),
    };
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((cur) => (cur ? clamp(cur.x, cur.y) : null));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos !== null, clamp]);

  const steps = storyboard.steps;
  const currentStep = steps[stepIndex] || steps[0];
  if (!currentStep) return null;

  const isDark = theme === 'obsidian';

  return (
    <div
      ref={barRef}
      className={
        pos
          ? 'pointer-events-auto fixed z-30 rounded-2xl border p-2.5 shadow-2xl backdrop-blur-md'
          : `pointer-events-auto fixed left-3 right-3 bottom-[88px] sm:bottom-[94px] z-30 rounded-2xl border p-2.5 shadow-2xl backdrop-blur-md transition-all ${
              aiDrawerOpen
                ? 'lg:left-14 lg:right-[488px]'
                : 'lg:left-1/2 lg:-translate-x-1/2 lg:w-[760px] lg:max-w-[90vw]'
            }`
      }
      style={{
        ...(pos ? { left: `${pos.x}px`, top: `${pos.y}px`, width: 'min(760px, calc(100vw - 16px))' } : undefined),
        backgroundColor: isDark ? 'rgba(18, 28, 40, 0.92)' : 'rgba(251, 248, 241, 0.95)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
        userSelect: dragging ? 'none' : undefined,
      }}
    >
      {/* Top Director Header (draggable) */}
      <div
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement | null)?.closest('button')) return;
          const el = barRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = {
            id: e.pointerId,
            sx: e.clientX,
            sy: e.clientY,
            ox: pos ? pos.x : r.left,
            oy: pos ? pos.y : r.top,
          };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d || d.id !== e.pointerId) return;
          setPos(clamp(d.ox + (e.clientX - d.sx), d.oy + (e.clientY - d.sy)));
        }}
        onPointerUp={(e) => {
          const d = dragRef.current;
          if (!d || d.id !== e.pointerId) return;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          dragRef.current = null;
          setDragging(false);
          setPos((cur) => {
            if (!cur) return null;
            const c = clamp(cur.x, cur.y);
            try {
              localStorage.setItem(AI_STAGE_POS_KEY, JSON.stringify(c));
            } catch {
              // Ignore
            }
            return c;
          });
        }}
        onDoubleClick={() => {
          setPos(null);
          try {
            localStorage.removeItem(AI_STAGE_POS_KEY);
          } catch {
            // Ignore
          }
        }}
        className={`flex flex-wrap items-center justify-between gap-2 touch-none select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        title="按住拖动移动 AI 演播条位置，双击复位"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-45 -ml-1" style={{ color: 'var(--text-muted)' }} />
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Sparkles className="h-3 w-3" />
            <span>
              AI 动态演播 · {stepIndex + 1}/{steps.length}
            </span>
          </span>

          {voiceSynced && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 border"
              style={{
                backgroundColor: isDark ? 'rgba(224, 166, 75, 0.16)' : 'rgba(180, 116, 23, 0.14)',
                borderColor: isDark ? 'rgba(224, 166, 75, 0.45)' : 'rgba(180, 116, 23, 0.42)',
                color: isDark ? '#F3C16E' : '#9B5E0B',
              }}
            >
              <span className="inline-flex items-end gap-[2px] h-2.5" aria-hidden="true">
                <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
                <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
                <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
              </span>
              <span>语音同步中</span>
            </span>
          )}

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
