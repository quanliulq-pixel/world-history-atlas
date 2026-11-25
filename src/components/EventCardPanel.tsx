import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  ExternalLink,
  GitCompareArrows,
  Landmark,
  Loader2,
  MapPin,
  Mountain,
  NotebookPen,
  Quote,
  Route as RouteIcon,
  Scale,
  ScrollText,
  Sparkles,
  Square,
  UserRound,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { DIMENSION_META, FIGURE_ROLE_META, REGION_META } from '../data/eras';
import { EVENT_MAP } from '../data/events';
import { findFigureByName, getContemporaryFigures } from '../data/figures';
import { HISTORICAL_ROUTES } from '../data/routes';
import type { Era, HistoricalFigure, HistoryEvent, SubPeriod, ThemeMode } from '../types/history';
import type { AiDocumentaryBeat } from '../utils/aiClient';
import { formatYear } from '../utils/timeline';

type SheetState = 'peek' | 'half' | 'full';

interface EventCardPanelProps {
  currentYear: number;
  currentEra: Era;
  currentSubPeriod: SubPeriod;
  selectedEvent: HistoryEvent | null;
  selectedFigure: HistoricalFigure | null;
  activeEvents: HistoryEvent[];
  activeFigures: HistoricalFigure[];
  masteredIds: Set<string>;
  bookmarkedIds: Set<string>;
  notes: Record<string, string>;
  theme: ThemeMode;
  sheetState: SheetState;
  desktopCollapsed: boolean;
  onChangeSheetState: (next: SheetState) => void;
  onToggleDesktopCollapse: () => void;
  onSelectEvent: (ev: HistoryEvent) => void;
  onSelectFigure: (fig: HistoricalFigure) => void;
  onCloseEvent: () => void;
  onCloseFigure: () => void;
  onToggleMastered: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onUpdateNote: (id: string, text: string) => void;
  onFocusRoute: (routeId: string) => void;
  onAskAiAboutEvent?: (ev: HistoryEvent) => void;
  onAskAiAboutFigure?: (fig: HistoricalFigure) => void;
  onAskAiAboutEra?: (era: Era, subPeriod: SubPeriod) => void;
  onCompareTopic?: (subject: string) => void;
  onNarrateEvent?: (ev: HistoryEvent) => void;
  onNarrateFigure?: (fig: HistoricalFigure) => void;
  narratingItemId?: string | null;
  narrationLoadingId?: string | null;
  narrationSubtitle?: string | null;
  narrationBeats?: AiDocumentaryBeat[] | null;
  activeBeatIndex?: number;
  onSelectNarrationBeat?: (idx: number) => void;
  onStopNarration?: () => void;
  suppressDesktop?: boolean;
}

const ROUTE_MAP = Object.fromEntries(HISTORICAL_ROUTES.map((r) => [r.id, r]));

export function EventCardPanel({
  currentYear,
  currentEra,
  currentSubPeriod,
  selectedEvent,
  selectedFigure,
  activeEvents,
  activeFigures,
  masteredIds,
  bookmarkedIds,
  notes,
  theme,
  sheetState,
  desktopCollapsed,
  onChangeSheetState,
  onToggleDesktopCollapse,
  onSelectEvent,
  onSelectFigure,
  onCloseEvent,
  onCloseFigure,
  onToggleMastered,
  onToggleBookmark,
  onUpdateNote,
  onFocusRoute,
  onAskAiAboutEvent,
  onAskAiAboutFigure,
  onAskAiAboutEra,
  onCompareTopic,
  onNarrateEvent,
  onNarrateFigure,
  narratingItemId,
  narrationLoadingId,
  narrationSubtitle,
  narrationBeats = null,
  activeBeatIndex = 0,
  onSelectNarrationBeat,
  onStopNarration,
  suppressDesktop = false,
}: EventCardPanelProps) {
  const [noteOpen, setNoteOpen] = useState(false);

  const renderNarrationBox = (itemId: string) => {
    if (narratingItemId !== itemId) return null;
    if (!narrationSubtitle && (!narrationBeats || narrationBeats.length === 0)) return null;
    const isDark = theme === 'obsidian';

    return (
      <div
        className="rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed space-y-1.5"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        {narrationBeats && narrationBeats.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold mr-1"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span className="inline-flex items-end gap-[2px] h-2.5" aria-hidden="true">
                  <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar" />
                  <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-2" />
                  <span className="w-[2px] h-2.5 rounded-full bg-current atlas-eq-bar atlas-eq-bar-3" />
                </span>
                <span>同步解说</span>
              </span>
              {narrationBeats.map((b, idx) => {
                const isAct = idx === activeBeatIndex;
                return (
                  <button
                    key={`${b.title}-${idx}`}
                    type="button"
                    onClick={() => onSelectNarrationBeat?.(idx)}
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold border transition cursor-pointer"
                    style={{
                      backgroundColor: isAct ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      borderColor: isAct ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: isAct ? '#FFFFFF' : 'var(--text-muted)',
                    }}
                  >
                    <span>第{idx + 1}幕</span>
                    <span>{b.title}</span>
                  </button>
                );
              })}
            </div>
            <div>
              {narrationBeats.map((b, idx) => {
                const isAct = idx === activeBeatIndex;
                return (
                  <span
                    key={`card-beat-${idx}`}
                    className={
                      isAct
                        ? 'rounded-sm px-0.5 py-[1px] font-medium transition-colors'
                        : 'opacity-65 transition-opacity'
                    }
                    style={
                      isAct
                        ? {
                            backgroundColor: isDark
                              ? 'rgba(224, 166, 75, 0.26)'
                              : 'rgba(180, 116, 23, 0.22)',
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
          <div>{narrationSubtitle}</div>
        )}
      </div>
    );
  };

  const cycleSheet = () => {
    if (sheetState === 'peek') onChangeSheetState('half');
    else if (sheetState === 'half') onChangeSheetState('full');
    else onChangeSheetState('peek');
  };

  const renderStatusActions = (itemId: string) => {
    const isMastered = masteredIds.has(itemId);
    const isBookmarked = bookmarkedIds.has(itemId);
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onToggleMastered(itemId)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: isMastered ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-surface)',
            borderColor: isMastered ? '#10B981' : 'var(--border-subtle)',
            color: isMastered ? '#059669' : 'var(--text-secondary)',
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{isMastered ? '已掌握' : '标记掌握'}</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleBookmark(itemId)}
          className="inline-flex items-center justify-center rounded-lg p-1.5 border transition cursor-pointer"
          style={{
            backgroundColor: isBookmarked ? 'rgba(245, 158, 11, 0.14)' : 'var(--bg-surface)',
            borderColor: isBookmarked ? '#F59E0B' : 'var(--border-subtle)',
            color: isBookmarked ? '#D97706' : 'var(--text-muted)',
          }}
          aria-label="收藏"
          title={isBookmarked ? '取消收藏' : '收藏卡片'}
        >
          <Bookmark className="h-3.5 w-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  const renderStudyFooter = (itemId: string, wikiUrl: string) => {
    const noteValue = notes[itemId] || '';
    return (
      <div
        className="rounded-xl border p-2.5 space-y-2"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            <NotebookPen className="h-3.5 w-3.5" style={{ color: 'var(--accent-gold)' }} />
            <span>{noteValue ? '个人笔记（已记录）' : '添加个人学习笔记'}</span>
          </button>

          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            <span>维基百科</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {(noteOpen || noteValue.length > 0) && (
          <textarea
            value={noteValue}
            onChange={(e) => onUpdateNote(itemId, e.target.value)}
            placeholder="随手记下引发的思考、制度规律或人物对比感悟（自动保存至本机浏览器）..."
            rows={3}
            className="w-full rounded-lg border p-2 text-xs focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        )}
      </div>
    );
  };

  const renderCardBody = (ev: HistoryEvent) => {
    const dimMeta = DIMENSION_META[ev.primaryDimension];
    const dimColor = theme === 'obsidian' ? dimMeta.darkColor : dimMeta.color;
    const causes = (ev.causes || []).map((id) => EVENT_MAP[id]).filter(Boolean);
    const effects = (ev.effects || []).map((id) => EVENT_MAP[id]).filter(Boolean);
    const routes = (ev.routeIds || []).map((id) => ROUTE_MAP[id]).filter(Boolean);

    return (
      <div className="space-y-3.5 pb-6">
        {/* Title & Actions */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className="rounded-full px-2 py-0.5 font-semibold"
                style={{ backgroundColor: dimMeta.bgTint, color: dimColor }}
              >
                {dimMeta.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
              >
                {REGION_META[ev.region].label}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{ev.dateDisplay}</span>
            </div>

            <button
              type="button"
              onClick={onCloseEvent}
              className="rounded-lg p-1 hover:opacity-75 cursor-pointer shrink-0"
              style={{ color: 'var(--text-muted)' }}
              aria-label="返回时代概览"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-1.5 text-base md:text-lg font-bold leading-snug">{ev.title}</h2>

          <div
            className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {ev.locationName}
            </span>
            {renderStatusActions(ev.id)}
          </div>
        </div>

        {/* Summary Callout */}
        <div
          className="rounded-xl p-3 text-xs md:text-[13px] leading-relaxed font-medium"
          style={{
            backgroundColor: 'var(--bg-muted)',
            borderLeft: `3px solid ${dimColor}`,
            color: 'var(--text-primary)',
          }}
        >
          {ev.card.summary}
        </div>

        {/* AI Learning Strip */}
        {(onAskAiAboutEvent || onCompareTopic || onNarrateEvent) && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {onAskAiAboutEvent && (
                <button
                  type="button"
                  onClick={() => onAskAiAboutEvent(ev)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(180, 116, 23, 0.12)',
                    borderColor: 'rgba(180, 116, 23, 0.35)',
                    color: theme === 'obsidian' ? '#E5A94C' : '#9B5E0B',
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>问 AI 导师</span>
                </button>
              )}
              {onCompareTopic && (
                <button
                  type="button"
                  onClick={() => onCompareTopic(ev.title)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <GitCompareArrows className="h-3 w-3" />
                  <span>跨代对比</span>
                </button>
              )}
              {onNarrateEvent && (
                <button
                  type="button"
                  onClick={() =>
                    narratingItemId === ev.id ? onStopNarration?.() : onNarrateEvent(ev)
                  }
                  disabled={narrationLoadingId === ev.id}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:opacity-85 disabled:opacity-60 cursor-pointer"
                  style={{
                    backgroundColor:
                      narratingItemId === ev.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    borderColor:
                      narratingItemId === ev.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: narratingItemId === ev.id ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {narrationLoadingId === ev.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>生成旁白中...</span>
                    </>
                  ) : narratingItemId === ev.id ? (
                    <>
                      <Square className="h-2.5 w-2.5" />
                      <span>停止播报</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3" />
                      <span>AI 语音解说</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {renderNarrationBox(ev.id)}
          </div>
        )}

        {/* Structured Lenses */}
        <div className="grid grid-cols-1 gap-2.5">
          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#8A673B' }}>
              <Mountain className="h-3.5 w-3.5" />
              <span>地缘与自然条件</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ev.card.geography}
            </p>
          </div>

          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#E0635A' : '#B83B3B' }}
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>政治博弈与制度</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ev.card.politics}
            </p>
          </div>

          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#E5A94C' : '#B47417' }}
            >
              <Coins className="h-3.5 w-3.5" />
              <span>经济与贸易逻辑</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ev.card.economy}
            </p>
          </div>

          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#A982D1' : '#734B9B' }}
            >
              <ScrollText className="h-3.5 w-3.5" />
              <span>文化与思想影响</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ev.card.culture}
            </p>
          </div>

          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#58A3D9' : '#296B9E' }}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>长期历史后果</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ev.card.consequence}
            </p>
          </div>
        </div>

        {/* Historiographical Debate */}
        {ev.card.debate && (
          <div
            className="rounded-xl border p-2.5 text-xs"
            style={{
              backgroundColor: 'rgba(115, 75, 155, 0.08)',
              borderColor: 'rgba(115, 75, 155, 0.25)',
            }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#C09EE8' : '#653C8F' }}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>史学多元视角 / 学术争鸣</span>
            </div>
            <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ev.card.debate}
            </p>
          </div>
        )}

        {/* Key Figures */}
        {ev.card.keyFigures && ev.card.keyFigures.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              关键人物：
            </span>
            {ev.card.keyFigures.map((figName) => {
              const matched = findFigureByName(figName);
              if (matched) {
                const roleMeta = FIGURE_ROLE_META[matched.role];
                const roleColor = theme === 'obsidian' ? roleMeta.darkColor : roleMeta.color;
                return (
                  <button
                    key={figName}
                    type="button"
                    onClick={() => onSelectFigure(matched)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition hover:opacity-85 cursor-pointer"
                    style={{
                      backgroundColor: roleMeta.bgTint,
                      borderColor: `${roleColor}66`,
                      color: roleColor,
                    }}
                    title={`点击查看「${matched.name}」人物档案`}
                  >
                    <UserRound className="h-3 w-3" />
                    <span>{figName}</span>
                  </button>
                );
              }
              return (
                <span
                  key={figName}
                  className="rounded-md px-2 py-0.5 text-[11px]"
                  style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)' }}
                >
                  {figName}
                </span>
              );
            })}
          </div>
        )}

        {/* Linked Routes */}
        {routes.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              关联历史通道（点击高亮路线）：
            </div>
            <div className="flex flex-wrap gap-1.5">
              {routes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onFocusRoute(r.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium border hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: r.color,
                    color: r.color,
                  }}
                >
                  <RouteIcon className="h-3 w-3" />
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Causal Links */}
        {(causes.length > 0 || effects.length > 0) && (
          <div
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-gold)' }} />
              <span>因果链条（点击跳转历史节点）</span>
            </div>

            {causes.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold" style={{ color: '#D97706' }}>
                  ← 上游前因
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {causes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectEvent(c)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border hover:opacity-85 cursor-pointer text-left"
                      style={{
                        backgroundColor: 'rgba(217, 119, 6, 0.08)',
                        borderColor: 'rgba(217, 119, 6, 0.3)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <ArrowLeft className="h-3 w-3 shrink-0" style={{ color: '#D97706' }} />
                      <span>{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {effects.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold" style={{ color: '#059669' }}>
                  → 下游后果
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {effects.map((ef) => (
                    <button
                      key={ef.id}
                      type="button"
                      onClick={() => onSelectEvent(ef)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border hover:opacity-85 cursor-pointer text-left"
                      style={{
                        backgroundColor: 'rgba(5, 150, 105, 0.08)',
                        borderColor: 'rgba(5, 150, 105, 0.3)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span>{ef.title}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" style={{ color: '#059669' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Personal Notes & External Link */}
        {renderStudyFooter(ev.id, ev.wikiUrl)}
      </div>
    );
  };

  const renderFigureBody = (fig: HistoricalFigure) => {
    const roleMeta = FIGURE_ROLE_META[fig.role];
    const roleColor = theme === 'obsidian' ? roleMeta.darkColor : roleMeta.color;
    const relatedEvents = fig.relatedEventIds.map((id) => EVENT_MAP[id]).filter(Boolean);
    const contemporaries = getContemporaryFigures(fig, 6);

    return (
      <div className="space-y-3.5 pb-6">
        {/* Header Badges & Actions */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                style={{ backgroundColor: roleMeta.bgTint, color: roleColor }}
              >
                <UserRound className="h-3 w-3" />
                <span>{roleMeta.label}</span>
              </span>
              <span
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
              >
                {REGION_META[fig.region].label}
              </span>
              <span
                className="inline-flex items-center gap-1"
                style={{ color: 'var(--text-muted)' }}
              >
                <Calendar className="h-3 w-3" />
                {fig.lifespanDisplay}
              </span>
            </div>

            <button
              type="button"
              onClick={onCloseFigure}
              className="rounded-lg p-1 hover:opacity-75 cursor-pointer shrink-0"
              style={{ color: 'var(--text-muted)' }}
              aria-label="返回时代概览"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: roleColor }}
            >
              {fig.monogram}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-base md:text-lg font-bold leading-snug">{fig.name}</h2>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {fig.enName}
                </span>
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {fig.title}
              </div>
            </div>
          </div>

          <div
            className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {fig.locationName}
            </span>
            {renderStatusActions(fig.id)}
          </div>
        </div>

        {/* One-liner Summary */}
        <div
          className="rounded-xl p-3 text-xs md:text-[13px] leading-relaxed font-medium"
          style={{
            backgroundColor: 'var(--bg-muted)',
            borderLeft: `3px solid ${roleColor}`,
            color: 'var(--text-primary)',
          }}
        >
          {fig.card.oneLiner}
        </div>

        {/* Famous Quote */}
        {fig.card.famousQuote && (
          <div
            className="flex items-start gap-2 rounded-xl border px-3 py-2 text-xs italic"
            style={{
              backgroundColor: roleMeta.bgTint,
              borderColor: `${roleColor}35`,
              color: 'var(--text-primary)',
            }}
          >
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: roleColor }} />
            <span>{fig.card.famousQuote}</span>
          </div>
        )}

        {/* AI Learning Strip */}
        {(onAskAiAboutFigure || onCompareTopic || onNarrateFigure) && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {onAskAiAboutFigure && (
                <button
                  type="button"
                  onClick={() => onAskAiAboutFigure(fig)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(180, 116, 23, 0.12)',
                    borderColor: 'rgba(180, 116, 23, 0.35)',
                    color: theme === 'obsidian' ? '#E5A94C' : '#9B5E0B',
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>问 AI 导师</span>
                </button>
              )}
              {onCompareTopic && (
                <button
                  type="button"
                  onClick={() => onCompareTopic(fig.name)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <GitCompareArrows className="h-3 w-3" />
                  <span>人物对比</span>
                </button>
              )}
              {onNarrateFigure && (
                <button
                  type="button"
                  onClick={() =>
                    narratingItemId === fig.id ? onStopNarration?.() : onNarrateFigure(fig)
                  }
                  disabled={narrationLoadingId === fig.id}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:opacity-85 disabled:opacity-60 cursor-pointer"
                  style={{
                    backgroundColor:
                      narratingItemId === fig.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    borderColor:
                      narratingItemId === fig.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: narratingItemId === fig.id ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {narrationLoadingId === fig.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>生成旁白中...</span>
                    </>
                  ) : narratingItemId === fig.id ? (
                    <>
                      <Square className="h-2.5 w-2.5" />
                      <span>停止播报</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3 w-3" />
                      <span>AI 语音介绍</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {renderNarrationBox(fig.id)}
          </div>
        )}

        {/* Biographical Lenses */}
        <div className="grid grid-cols-1 gap-2.5">
          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#8A673B' }}>
              <Mountain className="h-3.5 w-3.5" />
              <span>时代背景与历史条件</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {fig.card.eraContext}
            </p>
          </div>

          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: roleColor }}
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>核心功绩与制度/思想突破</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {fig.card.coreContributions}
            </p>
          </div>

          <div
            className="rounded-xl border p-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#58A3D9' : '#296B9E' }}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>深远历史影响</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {fig.card.historicalImpact}
            </p>
          </div>
        </div>

        {/* Controversy */}
        {fig.card.controversy && (
          <div
            className="rounded-xl border p-2.5 text-xs"
            style={{
              backgroundColor: 'rgba(115, 75, 155, 0.08)',
              borderColor: 'rgba(115, 75, 155, 0.25)',
            }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold"
              style={{ color: theme === 'obsidian' ? '#C09EE8' : '#653C8F' }}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>历史争议与多维评价</span>
            </div>
            <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {fig.card.controversy}
            </p>
          </div>
        )}

        {/* Linked Events */}
        {relatedEvents.length > 0 && (
          <div
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-gold)' }} />
              <span>关联历史大事（点击进入事件详卡）</span>
            </div>
            <div className="space-y-1.5">
              {relatedEvents.map((ev) => {
                const evDim = DIMENSION_META[ev.primaryDimension];
                const evColor = theme === 'obsidian' ? evDim.darkColor : evDim.color;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition hover:opacity-85 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: evColor }}
                      />
                      <span className="truncate font-semibold">{ev.title}</span>
                    </div>
                    <span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {ev.dateDisplay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Contemporaries */}
        {contemporaries.length > 0 && (
          <div
            className="rounded-xl border p-2.5 space-y-2"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
              <UserRound className="h-3.5 w-3.5" style={{ color: roleColor }} />
              <span>同代交汇人物（同时期全球视野）</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {contemporaries.map((c) => {
                const cMeta = FIGURE_ROLE_META[c.role];
                const cColor = theme === 'obsidian' ? cMeta.darkColor : cMeta.color;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectFigure(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition hover:opacity-85 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                      style={{ backgroundColor: cColor }}
                    >
                      {c.monogram}
                    </span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {REGION_META[c.region].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {renderStudyFooter(fig.id, fig.wikiUrl)}
      </div>
    );
  };

  const renderEraOverview = () => (
    <div className="space-y-3 pb-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold" style={{ color: currentEra.accentColor }}>
            {formatYear(currentEra.startYear)} — {formatYear(currentEra.endYear)}
          </div>
          <h2 className="text-base font-bold mt-0.5">{currentEra.name}</h2>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
        >
          当期 {activeEvents.length} 件大事
        </span>
      </div>

      {/* Active sub-period context */}
      <div
        className="rounded-xl border px-3 py-2 text-xs"
        style={{
          backgroundColor: `${currentEra.accentColor}12`,
          borderColor: `${currentEra.accentColor}44`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[11px]" style={{ color: currentEra.accentColor }}>
            细分阶段：{currentSubPeriod.name}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatYear(currentSubPeriod.startYear)} — {formatYear(currentSubPeriod.endYear)}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {currentSubPeriod.themeSummary}
        </p>
      </div>

      {/* Macro era framework */}
      <div
        className="rounded-xl border p-2.5 space-y-2 text-xs"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <span className="font-bold" style={{ color: '#B83B3B' }}>
            地缘格局：
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{currentEra.overview.geopolitics}</span>
        </div>
        <div>
          <span className="font-bold" style={{ color: '#B47417' }}>
            经济引擎：
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{currentEra.overview.economy}</span>
        </div>
        <div>
          <span className="font-bold" style={{ color: '#734B9B' }}>
            文化范式：
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{currentEra.overview.culture}</span>
        </div>
      </div>

      {onAskAiAboutEra && (
        <button
          type="button"
          onClick={() => onAskAiAboutEra(currentEra, currentSubPeriod)}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-90 cursor-pointer"
          style={{
            backgroundColor: 'rgba(140, 45, 45, 0.10)',
            borderColor: 'rgba(140, 45, 45, 0.35)',
            color: 'var(--accent-primary)',
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI 导师精讲本时代（配地图动画）</span>
        </button>
      )}

      {/* Active historical figures */}
      {activeFigures.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            {formatYear(currentYear)} 在世或活跃著名人物（点击查看档案）：
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeFigures.map((fig) => {
              const roleMeta = FIGURE_ROLE_META[fig.role];
              const roleColor = theme === 'obsidian' ? roleMeta.darkColor : roleMeta.color;
              const isMastered = masteredIds.has(fig.id);
              return (
                <button
                  key={fig.id}
                  type="button"
                  onClick={() => onSelectFigure(fig)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                    style={{ backgroundColor: roleColor }}
                  >
                    {fig.monogram}
                  </span>
                  <span className="font-semibold">{fig.name}</span>
                  {isMastered && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active chronological event list */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {formatYear(currentYear)} 前后活跃大事（点击查看结构化卡片）：
        </div>
        {activeEvents.length === 0 ? (
          <div
            className="rounded-xl border p-4 text-center text-xs"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            当前筛选条件下此时期暂无激活事件，可尝试开启“全部维度”或使用下方时间轴快速步进。
          </div>
        ) : (
          activeEvents.map((ev) => {
            const dim = DIMENSION_META[ev.primaryDimension];
            const dotColor = theme === 'obsidian' ? dim.darkColor : dim.color;
            const isMastered = masteredIds.has(ev.id);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onSelectEvent(ev)}
                className="w-full flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      {ev.dateDisplay} · {REGION_META[ev.region].label}
                    </span>
                    {isMastered && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                  </div>
                  <div className="font-semibold text-xs md:text-[13px] mt-0.5">{ev.title}</div>
                  <div className="text-[11px] line-clamp-1 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {ev.card.summary}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const mobileHeightClass =
    sheetState === 'full' ? 'h-[80%]' : sheetState === 'half' ? 'h-[46%]' : 'h-12';

  return (
    <>
      {/* Desktop Right Drawer */}
      <aside
        className={`pointer-events-none ${suppressDesktop ? 'hidden' : 'hidden lg:flex'} absolute right-3 top-3 bottom-3 z-20 flex-col items-end`}
      >
        {desktopCollapsed && !selectedEvent && !selectedFigure ? (
          <button
            type="button"
            onClick={onToggleDesktopCollapse}
            className="pointer-events-auto rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            展开时代卡片 ({activeEvents.length})
          </button>
        ) : (
          <div
            className="pointer-events-auto flex h-full w-[410px] flex-col rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden"
            style={{
              backgroundColor:
                theme === 'obsidian' ? 'rgba(20, 30, 43, 0.94)' : 'rgba(251, 248, 241, 0.95)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {!selectedEvent && !selectedFigure && (
              <div
                className="flex items-center justify-between px-4 py-2 border-b text-[11px]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span>学习卡片面板</span>
                <button
                  type="button"
                  onClick={onToggleDesktopCollapse}
                  className="hover:opacity-75 cursor-pointer"
                >
                  收起看全图
                </button>
              </div>
            )}
            <div className="atlas-scroll flex-1 overflow-y-auto px-4 pt-3.5">
              <div
                key={selectedEvent?.id || selectedFigure?.id || `${currentEra.id}-${currentSubPeriod.id}`}
                className="atlas-card-enter"
              >
                {selectedEvent
                  ? renderCardBody(selectedEvent)
                  : selectedFigure
                    ? renderFigureBody(selectedFigure)
                    : renderEraOverview()}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile / Tablet Bottom Sheet */}
      <section
        className={`pointer-events-auto lg:hidden absolute left-0 right-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t shadow-2xl transition-all duration-200 backdrop-blur-md ${mobileHeightClass}`}
        style={{
          backgroundColor:
            theme === 'obsidian' ? 'rgba(20, 30, 43, 0.96)' : 'rgba(251, 248, 241, 0.97)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          onClick={cycleSheet}
          className="flex h-12 shrink-0 items-center justify-between px-4 cursor-pointer select-none border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-1.5 w-8 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--border-strong)' }}
            />
            <span className="truncate text-xs font-bold">
              {selectedEvent
                ? selectedEvent.title
                : selectedFigure
                  ? `${selectedFigure.name} · ${selectedFigure.title}`
                  : `${currentEra.shortName} · ${activeEvents.length} 件大事 / ${activeFigures.length} 位人物`}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
            <span className="text-[11px]">
              {sheetState === 'peek' ? '展开' : sheetState === 'half' ? '全屏' : '收起'}
            </span>
            {sheetState === 'full' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
        </div>

        {sheetState !== 'peek' && (
          <div className="atlas-scroll flex-1 overflow-y-auto px-3.5 pt-3">
            <div
              key={selectedEvent?.id || selectedFigure?.id || `${currentEra.id}-${currentSubPeriod.id}`}
              className="atlas-card-enter"
            >
              {selectedEvent
                ? renderCardBody(selectedEvent)
                : selectedFigure
                  ? renderFigureBody(selectedFigure)
                  : renderEraOverview()}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
