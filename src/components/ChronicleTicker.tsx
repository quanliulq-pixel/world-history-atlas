import {
  BookOpen,
  ChevronDown,
  Film,
  GripVertical,
  Loader2,
  Maximize2,
  Minus,
  PanelRight,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DIMENSION_META, REGION_META } from '../data/eras';
import type { Era, HistoryEvent, SubPeriod, ThemeMode } from '../types/history';
import type { AiDocumentaryBeat } from '../utils/aiClient';
import { formatYear } from '../utils/timeline';

const TICKER_POS_KEY = 'world-history-atlas:ticker-pos:v2';
const TICKER_SIZE_KEY = 'world-history-atlas:ticker-size:v2';
const TICKER_COMPACT_KEY = 'world-history-atlas:ticker-compact:v2';
const MIN_TICKER_WIDTH = 340;
const MIN_TICKER_HEIGHT = 104;

interface TickerPos {
  x: number;
  y: number;
}

interface TickerSize {
  width: number;
  height: number | null;
}

type ResizeEdge = 'right' | 'bottom' | 'corner';

function readStoredTickerPos(): TickerPos | null {
  try {
    const raw = localStorage.getItem(TICKER_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TickerPos>;
    if (
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredTickerPos(pos: TickerPos | null): void {
  try {
    if (!pos) localStorage.removeItem(TICKER_POS_KEY);
    else localStorage.setItem(TICKER_POS_KEY, JSON.stringify(pos));
  } catch {
    // Ignore storage errors
  }
}

function readStoredTickerSize(): TickerSize | null {
  try {
    const raw = localStorage.getItem(TICKER_SIZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TickerSize>;
    if (typeof parsed.width === 'number' && Number.isFinite(parsed.width)) {
      const height =
        typeof parsed.height === 'number' && Number.isFinite(parsed.height)
          ? parsed.height
          : null;
      return { width: parsed.width, height };
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredTickerSize(size: TickerSize | null): void {
  try {
    if (!size) localStorage.removeItem(TICKER_SIZE_KEY);
    else localStorage.setItem(TICKER_SIZE_KEY, JSON.stringify(size));
  } catch {
    // Ignore storage errors
  }
}

function readStoredTickerCompact(): boolean {
  try {
    return localStorage.getItem(TICKER_COMPACT_KEY) !== '0';
  } catch {
    return true;
  }
}

function saveStoredTickerCompact(compact: boolean): void {
  try {
    localStorage.setItem(TICKER_COMPACT_KEY, compact ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
}

interface ChronicleTickerProps {
  visible: boolean;
  cinemaMode: boolean;
  isPlaying: boolean;
  currentYear: number;
  currentEra: Era;
  currentSubPeriod: SubPeriod;
  event: HistoryEvent | null;
  theme: ThemeMode;
  playSpeed: number;
  speedOptions: number[];
  voiceEnabled: boolean;
  narrationDepth?: 'story' | 'concise';
  onToggleNarrationDepth?: () => void;
  syncCardDuringPlay?: boolean;
  narrationStatus?: 'idle' | 'loading' | 'playing' | 'browser';
  narrationSubtitle?: string | null;
  narrationBeats?: AiDocumentaryBeat[] | null;
  activeBeatIndex?: number;
  chapterLabel?: string | null;
  tickerSpokenText?: string | null;
  onSelectSpeed: (speed: number) => void;
  onToggleVoice: () => void;
  onToggleSyncCard?: () => void;
  onSelectEvent: (ev: HistoryEvent) => void;
  onStopPlayback: () => void;
  onDismiss: () => void;
  rightDrawerVisible?: boolean;
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
  playSpeed,
  speedOptions,
  voiceEnabled,
  narrationDepth = 'story',
  onToggleNarrationDepth,
  syncCardDuringPlay = true,
  narrationStatus = 'idle',
  narrationSubtitle = null,
  narrationBeats = null,
  activeBeatIndex = 0,
  chapterLabel = null,
  tickerSpokenText = null,
  onSelectSpeed,
  onToggleVoice,
  onToggleSyncCard,
  onSelectEvent,
  onStopPlayback,
  onDismiss,
  rightDrawerVisible = false,
}: ChronicleTickerProps) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const [pos, setPos] = useState<TickerPos | null>(() => readStoredTickerPos());
  const [size, setSize] = useState<TickerSize | null>(() => readStoredTickerSize());
  const [compact, setCompact] = useState<boolean>(() => readStoredTickerCompact());
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const speedRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const activeBeatRef = useRef<HTMLSpanElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    edge: ResizeEdge;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const clampPosToParent = useCallback(
    (x: number, y: number): TickerPos => {
      const card = cardRef.current;
      const parent = card?.offsetParent as HTMLElement | null;
      if (!card || !parent) return { x: Math.max(8, x), y: Math.max(8, y) };
      const pad = 8;
      const rightReserve = rightDrawerVisible && parent.clientWidth >= 1024 ? 434 : pad;
      const maxX = Math.max(pad, parent.clientWidth - card.offsetWidth - rightReserve);
      const maxY = Math.max(pad, parent.clientHeight - card.offsetHeight - pad);
      return {
        x: Math.round(Math.max(pad, Math.min(maxX, x))),
        y: Math.round(Math.max(pad, Math.min(maxY, y))),
      };
    },
    [rightDrawerVisible],
  );

  const clampSizeToParent = useCallback(
    (width: number, height: number | null, anchorLeft?: number, anchorTop?: number): TickerSize => {
      const card = cardRef.current;
      const parent = card?.offsetParent as HTMLElement | null;
      if (!card || !parent) {
        return {
          width: Math.round(Math.max(MIN_TICKER_WIDTH, width)),
          height: height === null ? null : Math.round(Math.max(MIN_TICKER_HEIGHT, height)),
        };
      }
      const pad = 8;
      const rightReserve = rightDrawerVisible && parent.clientWidth >= 1024 ? 434 : pad;
      const maxWidth =
        anchorLeft !== undefined
          ? Math.max(MIN_TICKER_WIDTH, parent.clientWidth - anchorLeft - rightReserve)
          : Math.max(MIN_TICKER_WIDTH, parent.clientWidth - pad - rightReserve);
      const maxHeight =
        anchorTop !== undefined
          ? Math.max(MIN_TICKER_HEIGHT, parent.clientHeight - anchorTop - pad)
          : Math.max(MIN_TICKER_HEIGHT, parent.clientHeight - pad * 2);
      return {
        width: Math.round(Math.max(MIN_TICKER_WIDTH, Math.min(maxWidth, width))),
        height:
          height === null
            ? null
            : Math.round(Math.max(MIN_TICKER_HEIGHT, Math.min(maxHeight, height))),
      };
    },
    [rightDrawerVisible],
  );

  useEffect(() => {
    if (!visible || (!pos && !size)) return;
    const syncClamp = () => {
      setSize((cur) => {
        if (!cur) return null;
        const card = cardRef.current;
        const parent = card?.offsetParent as HTMLElement | null;
        const cardRect = card?.getBoundingClientRect();
        const parentRect = parent?.getBoundingClientRect();
        const anchorLeft = pos
          ? pos.x
          : cardRect && parentRect
            ? Math.round(cardRect.left - parentRect.left)
            : undefined;
        const anchorTop = pos
          ? pos.y
          : cardRect && parentRect
            ? Math.round(cardRect.top - parentRect.top)
            : undefined;
        const clamped = clampSizeToParent(cur.width, cur.height, anchorLeft, anchorTop);
        return clamped.width === cur.width && clamped.height === cur.height ? cur : clamped;
      });
      setPos((cur) => {
        if (!cur) return null;
        const clamped = clampPosToParent(cur.x, cur.y);
        return clamped.x === cur.x && clamped.y === cur.y ? cur : clamped;
      });
    };
    const rafId = window.requestAnimationFrame(syncClamp);
    window.addEventListener('resize', syncClamp);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncClamp);
    };
  }, [
    visible,
    compact,
    pos !== null,
    size !== null,
    rightDrawerVisible,
    clampPosToParent,
    clampSizeToParent,
  ]);

  useEffect(() => {
    if (!speedOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) {
        setSpeedOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutside);
    return () => window.removeEventListener('mousedown', onOutside);
  }, [speedOpen]);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button, a, input, select, [role="listbox"]')) return;
    const card = cardRef.current;
    const parent = card?.offsetParent as HTMLElement | null;
    if (!card || !parent) return;

    const cardRect = card.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const originLeft = pos ? pos.x : cardRect.left - parentRect.left;
    const originTop = pos ? pos.y : cardRect.top - parentRect.top;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft,
      originTop,
    };
    setIsDragging(true);
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const next = clampPosToParent(
      drag.originLeft + (e.clientX - drag.startX),
      drag.originTop + (e.clientY - drag.startY),
    );
    setPos(next);
  };

  const handleDragPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    setPos((cur) => {
      if (!cur) return null;
      const clamped = clampPosToParent(cur.x, cur.y);
      saveStoredTickerPos(clamped);
      return clamped;
    });
  };

  const handleResizePointerDown =
    (edge: ResizeEdge) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const card = cardRef.current;
      const parent = card?.offsetParent as HTMLElement | null;
      if (!card || !parent) return;

      const cardRect = card.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const originLeft = pos ? pos.x : Math.round(cardRect.left - parentRect.left);
      const originTop = pos ? pos.y : Math.round(cardRect.top - parentRect.top);
      if (!pos) {
        setPos({ x: originLeft, y: originTop });
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = {
        pointerId: e.pointerId,
        edge,
        startX: e.clientX,
        startY: e.clientY,
        originLeft,
        originTop,
        startWidth: Math.round(cardRect.width),
        startHeight: Math.round(cardRect.height),
      };
      setIsResizing(true);
    };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;
    const nextWidth = resize.edge === 'bottom' ? resize.startWidth : resize.startWidth + dx;
    const nextHeight =
      resize.edge === 'right' ? (size?.height ?? null) : resize.startHeight + dy;
    setSize(
      clampSizeToParent(nextWidth, nextHeight, resize.originLeft, resize.originTop),
    );
  };

  const handleResizePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resizeRef.current = null;
    setIsResizing(false);
    setSize((cur) => {
      if (!cur) return null;
      const clamped = clampSizeToParent(
        cur.width,
        cur.height,
        resize.originLeft,
        resize.originTop,
      );
      saveStoredTickerSize(clamped);
      return clamped;
    });
    setPos((cur) => {
      if (!cur) return null;
      const clamped = clampPosToParent(cur.x, cur.y);
      saveStoredTickerPos(clamped);
      return clamped;
    });
  };

  const handleResetSize = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSize(null);
    saveStoredTickerSize(null);
  };

  const handleResetPos = () => {
    setPos(null);
    setSize(null);
    setCompact(false);
    saveStoredTickerPos(null);
    saveStoredTickerSize(null);
    saveStoredTickerCompact(false);
  };

  const handleToggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      saveStoredTickerCompact(next);
      return next;
    });
  };

  useEffect(() => {
    if (!visible || compact) return;
    activeBeatRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeBeatIndex, narrationBeats, visible, compact]);

  if (!visible) return null;

  const activeMode = cinemaMode || isPlaying;
  const accent = event
    ? theme === 'obsidian'
      ? DIMENSION_META[event.primaryDimension].darkColor
      : DIMENSION_META[event.primaryDimension].color
    : currentEra.accentColor;

  const parentHeight = (cardRef.current?.offsetParent as HTMLElement | null)?.clientHeight ?? 0;
  const openSpeedUpward = Boolean(pos && parentHeight > 0 && pos.y > parentHeight * 0.55);
  const maxHeightClass = !compact && (!size || size.height === null) ? ' max-h-[48vh]' : '';

  if (compact) {
    return (
      <div
        ref={cardRef}
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerEnd}
        onPointerCancel={handleDragPointerEnd}
        onDoubleClick={handleToggleCompact}
        className={
          pos
            ? `pointer-events-auto absolute z-30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-xl backdrop-blur-md max-w-[calc(100%-16px)] whitespace-nowrap touch-none select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`
            : `atlas-ticker-enter pointer-events-auto absolute left-3 md:left-16 ${
                rightDrawerVisible ? 'lg:left-[calc(50%-210px)] lg:-translate-x-1/2' : 'lg:left-1/2 lg:-translate-x-1/2'
              } top-2.5 z-30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-xl backdrop-blur-md max-w-[calc(100%-16px)] whitespace-nowrap touch-none select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`
        }
        style={{
          ...(pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined),
          backgroundColor:
            theme === 'obsidian' ? 'rgba(18, 28, 40, 0.94)' : 'rgba(251, 248, 241, 0.96)',
          borderColor: accent,
          color: 'var(--text-primary)',
          userSelect: isDragging ? 'none' : undefined,
        }}
        title="按住拖动胶囊位置，双击或点右侧按钮展开"
      >
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 opacity-45 -ml-1"
          style={{ color: 'var(--text-muted)' }}
          aria-hidden="true"
        />
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: accent }}
        >
          {cinemaMode ? <Film className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          <span>{cinemaMode ? '电影演进' : isPlaying ? '进程实况' : '编年'}</span>
        </span>
        <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: accent }}>
          {formatYear(currentYear)}
        </span>
        {activeMode && voiceEnabled && narrationStatus !== 'idle' && (
          <span
            className="inline-flex items-end gap-[2px] h-2.5 shrink-0"
            style={{ color: accent }}
            aria-hidden="true"
          >
            <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
            <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
            <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
          </span>
        )}
        {activeMode && (
          <button
            type="button"
            onClick={onStopPlayback}
            className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold hover:opacity-80 cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
            title="暂停演进"
          >
            <Pause className="h-2.5 w-2.5" />
            <span>暂停</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleToggleCompact}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold hover:opacity-85 cursor-pointer shrink-0"
          style={{
            backgroundColor: `${accent}1A`,
            borderColor: `${accent}55`,
            color: accent,
          }}
          title="展开编年悬浮窗"
          aria-label="展开编年悬浮窗"
        >
          <Maximize2 className="h-3 w-3" />
          <span>展开</span>
        </button>
        {!activeMode && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-0.5 hover:opacity-75 cursor-pointer shrink-0"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭编年提示"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={
        pos
          ? `pointer-events-auto absolute z-30 flex flex-col overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-xl backdrop-blur-md max-w-[calc(100%-16px)] ${
              rightDrawerVisible ? 'lg:max-w-[calc(100%-450px)]' : ''
            }${maxHeightClass}`
          : rightDrawerVisible
            ? `atlas-ticker-enter pointer-events-auto absolute left-3 md:left-16 ${
                size ? '' : 'right-3 lg:right-auto lg:w-[min(500px,calc(100%-504px))]'
              } lg:left-16 max-w-full top-3 z-30 flex flex-col overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-xl backdrop-blur-md${maxHeightClass}`
            : `atlas-ticker-enter pointer-events-auto absolute left-3 md:left-16 ${
                size ? '' : 'right-3 lg:right-auto lg:w-[540px]'
              } lg:left-1/2 lg:-translate-x-1/2 max-w-full top-3 z-30 flex flex-col overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-xl backdrop-blur-md${maxHeightClass}`
      }
      style={{
        ...(pos
          ? {
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: size
                ? `${size.width}px`
                : rightDrawerVisible
                  ? 'min(500px, calc(100% - 16px))'
                  : 'min(540px, calc(100% - 16px))',
            }
          : size
            ? { width: `${size.width}px` }
            : undefined),
        ...(!compact && size && size.height !== null ? { height: `${size.height}px` } : undefined),
        backgroundColor:
          theme === 'obsidian' ? 'rgba(18, 28, 40, 0.92)' : 'rgba(251, 248, 241, 0.94)',
        borderColor: accent,
        color: 'var(--text-primary)',
        userSelect: isDragging || isResizing ? 'none' : undefined,
      }}
    >
      <div
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerEnd}
        onPointerCancel={handleDragPointerEnd}
        onDoubleClick={handleResetPos}
        className={`flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 touch-none select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        title="按住拖动位置，拖右下角或边缘缩放，双击恢复默认位置与尺寸"
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <GripVertical
            className="h-3.5 w-3.5 shrink-0 opacity-45 hover:opacity-80 transition-opacity -ml-1"
            style={{ color: 'var(--text-muted)' }}
            aria-hidden="true"
          />
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

        <div className="flex flex-wrap items-center gap-1 min-w-0 max-w-full">
          {activeMode && (
            <div ref={speedRef} className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((v) => !v)}
                className="inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold hover:opacity-85 cursor-pointer"
                style={{
                  backgroundColor: speedOpen ? `${accent}1E` : 'var(--bg-surface)',
                  borderColor: speedOpen ? accent : 'var(--border-subtle)',
                  color: speedOpen ? accent : 'var(--text-primary)',
                }}
                title="调整播放倍速"
              >
                <span className="tabular-nums">{playSpeed}×</span>
                <ChevronDown className="h-2.5 w-2.5 opacity-75" />
              </button>

              {speedOpen && (
                <div
                  className={`absolute right-0 z-40 min-w-[72px] rounded-xl border p-1 shadow-xl backdrop-blur-md ${
                    openSpeedUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                  }`}
                  style={{
                    backgroundColor:
                      theme === 'obsidian' ? 'rgba(18, 28, 40, 0.96)' : 'rgba(251, 248, 241, 0.98)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  {speedOptions.map((spd) => {
                    const active = spd === playSpeed;
                    return (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          onSelectSpeed(spd);
                          setSpeedOpen(false);
                        }}
                        className="block w-full rounded-md px-2 py-1 text-left text-[10.5px] font-semibold tabular-nums hover:opacity-85 cursor-pointer"
                        style={{
                          backgroundColor: active ? accent : 'transparent',
                          color: active ? '#FFFFFF' : 'var(--text-primary)',
                        }}
                      >
                        {spd}×
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeMode && (
            <button
              type="button"
              onClick={onToggleVoice}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: voiceEnabled ? 'rgba(180, 116, 23, 0.16)' : 'var(--bg-surface)',
                borderColor: voiceEnabled ? '#B47417' : 'var(--border-subtle)',
                color: voiceEnabled ? (theme === 'obsidian' ? '#E5A94C' : '#9B5E0B') : 'var(--text-muted)',
              }}
              title={cinemaMode ? '开启或关闭电影模式语音旁白' : '开启或关闭进程实况语音播报'}
            >
              {narrationStatus === 'loading' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : voiceEnabled ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
              <span>{voiceEnabled ? (cinemaMode ? 'AI 旁白' : '语音播报') : '静音'}</span>
            </button>
          )}

          {activeMode && onToggleNarrationDepth && (
            <button
              type="button"
              onClick={onToggleNarrationDepth}
              className="inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor:
                  narrationDepth === 'story' ? `${accent}1E` : 'var(--bg-surface)',
                borderColor: narrationDepth === 'story' ? accent : 'var(--border-subtle)',
                color: narrationDepth === 'story' ? accent : 'var(--text-muted)',
              }}
              title={
                narrationDepth === 'story'
                  ? '深度听书模式：含年代过渡与事件完整前因后果，点击切回精简快报'
                  : '精简快报模式：点击开启深度听书模式'
              }
            >
              <BookOpen className="h-3 w-3" />
              <span>{narrationDepth === 'story' ? '深度听书' : '精简'}</span>
            </button>
          )}

          {isPlaying && !cinemaMode && onToggleSyncCard && (
            <button
              type="button"
              onClick={onToggleSyncCard}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: syncCardDuringPlay ? 'rgba(5, 150, 105, 0.14)' : 'var(--bg-surface)',
                borderColor: syncCardDuringPlay ? '#059669' : 'var(--border-subtle)',
                color: syncCardDuringPlay ? '#059669' : 'var(--text-muted)',
              }}
              title="开启后，演进播报大事件时自动同步展开右侧详卡"
            >
              <PanelRight className="h-3 w-3" />
              <span>联动详卡</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleCompact}
            className="rounded-lg border p-1 hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
            title="最小化编年悬浮窗"
            aria-label="最小化编年悬浮窗"
          >
            <Minus className="h-3 w-3" />
          </button>

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

      {!compact && (
        <div className="atlas-scroll mt-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
          {chapterLabel && (
            <div
              className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10.5px] font-bold"
              style={{
                backgroundColor: `${accent}18`,
                borderColor: `${accent}55`,
                color: accent,
              }}
            >
              <BookOpen className="h-3 w-3 shrink-0" />
              <span>{chapterLabel}</span>
            </div>
          )}

          {event ? (
            <button
              type="button"
              onClick={() => onSelectEvent(event)}
              className="w-full text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs sm:text-[13px] font-bold group-hover:underline">
                  {event.title}
                </span>
                <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {REGION_META[event.region].label}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {event.card.summary}
              </p>
            </button>
          ) : (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {currentSubPeriod.themeSummary}
            </p>
          )}

          {isPlaying &&
            !cinemaMode &&
            voiceEnabled &&
            tickerSpokenText &&
            (!narrationBeats || narrationBeats.length === 0) && (
              <div
                className="mt-2 flex items-start gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  className="mt-1 inline-flex items-end gap-[2px] h-2.5 shrink-0"
                  style={{ color: accent }}
                  aria-hidden="true"
                >
                  <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
                  <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
                  <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
                </span>
                <span>{tickerSpokenText}</span>
              </div>
            )}

          {activeMode && voiceEnabled && ((narrationBeats && narrationBeats.length > 0) || narrationSubtitle) && (
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
                      <span>{chapterLabel ? '年代脉络演播' : '深度听书 · 分幕演播'}</span>
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
                          ref={isAct ? activeBeatRef : undefined}
                          className={
                            isAct
                              ? 'rounded-sm px-0.5 py-[1px] font-medium transition-colors'
                              : 'opacity-65 transition-opacity'
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
      )}

      <div
        onPointerDown={handleResizePointerDown('right')}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerEnd}
        onPointerCancel={handleResizePointerEnd}
        className="absolute top-3 bottom-4 right-0 w-2 cursor-ew-resize touch-none"
        title="拖动调整宽度"
        aria-hidden="true"
      />

      {!compact && (
        <>
          <div
            onPointerDown={handleResizePointerDown('bottom')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerEnd}
            onPointerCancel={handleResizePointerEnd}
            className="absolute left-3 right-4 bottom-0 h-2 cursor-ns-resize touch-none"
            title="拖动调整高度"
            aria-hidden="true"
          />
          <div
            onPointerDown={handleResizePointerDown('corner')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerEnd}
            onPointerCancel={handleResizePointerEnd}
            onDoubleClick={handleResetSize}
            className="absolute right-0.5 bottom-0.5 flex h-5 w-5 items-end justify-end p-1 rounded-br-2xl cursor-nwse-resize touch-none opacity-55 hover:opacity-100 transition-opacity"
            style={{ color: accent }}
            title="拖动缩放大小，双击恢复默认尺寸"
            aria-label="拖动缩放编年面板尺寸"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path
                d="M9 1L1 9M9 5L5 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
