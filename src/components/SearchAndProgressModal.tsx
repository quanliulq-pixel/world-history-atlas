import { Search, UserRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DIMENSION_META, ERAS, FIGURE_ROLE_META, REGION_META } from '../data/eras';
import { ALL_EVENTS } from '../data/events';
import { ALL_FIGURES } from '../data/figures';
import type {
  Dimension,
  FigureRole,
  HistoricalFigure,
  HistoryEvent,
  ThemeMode,
  WorldRegion,
} from '../types/history';

interface SearchAndProgressModalProps {
  open: boolean;
  theme: ThemeMode;
  onClose: () => void;
  onSelectEvent: (ev: HistoryEvent) => void;
  onSelectFigure: (fig: HistoricalFigure) => void;
}

export function SearchAndProgressModal({
  open,
  theme,
  onClose,
  onSelectEvent,
  onSelectFigure,
}: SearchAndProgressModalProps) {
  const [tab, setTab] = useState<'search' | 'figures'>('search');
  const [query, setQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<WorldRegion | 'all'>('all');
  const [filterDim, setFilterDim] = useState<Dimension | 'all'>('all');
  const [filterRole, setFilterRole] = useState<FigureRole | 'all'>('all');
  const [filterEra, setFilterEra] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_EVENTS.filter((ev) => {
      if (filterRegion !== 'all' && ev.region !== filterRegion) return false;
      if (filterDim !== 'all' && !ev.dimensions.includes(filterDim)) return false;
      if (filterEra !== 'all' && ev.eraId !== filterEra) return false;
      if (!q) return true;
      const haystack = [
        ev.title,
        ev.locationName,
        ev.dateDisplay,
        ev.card.summary,
        ev.card.politics,
        ev.card.economy,
        ev.card.culture,
        ...(ev.card.keyFigures || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, filterRegion, filterDim, filterEra]);

  const filteredFigures = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_FIGURES.filter((fig) => {
      if (filterRegion !== 'all' && fig.region !== filterRegion) return false;
      if (filterDim !== 'all' && !fig.dimensions.includes(filterDim)) return false;
      if (filterRole !== 'all' && fig.role !== filterRole) return false;
      if (filterEra !== 'all' && fig.eraId !== filterEra) return false;
      if (!q) return true;
      const haystack = [
        fig.name,
        fig.enName,
        ...(fig.aliases || []),
        fig.title,
        fig.locationName,
        fig.lifespanDisplay,
        fig.card.oneLiner,
        fig.card.coreContributions,
        fig.card.historicalImpact,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, filterRegion, filterDim, filterRole, filterEra]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(12, 18, 26, 0.58)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme === 'obsidian' ? '#141E2B' : '#FBF8F1',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Tabs */}
        <div
          className="flex items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setTab('search')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: tab === 'search' ? 'var(--accent-primary)' : 'var(--bg-muted)',
                color: tab === 'search' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span>历史大事 ({ALL_EVENTS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('figures')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: tab === 'figures' ? 'var(--accent-primary)' : 'var(--bg-muted)',
                color: tab === 'figures' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              <UserRound className="h-3.5 w-3.5" />
              <span>历史人物 ({ALL_FIGURES.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer shrink-0"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭检索窗口"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search Filters */}
          <div
            className="border-b p-3 space-y-2"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  tab === 'figures'
                    ? '搜索历史人物姓名、称号、成就或地区（如：孔子、牛顿、张居正、瓦特、曼德拉...）'
                    : '搜索人物、事件、制度或关键词（如：白银、蒸汽机、大宪章、丝绸之路、马克思...）'
                }
                className="w-full rounded-xl border py-2 pl-9 pr-3 text-xs sm:text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {tab === 'figures' && (
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as FigureRole | 'all')}
                  className="rounded-lg border px-2 py-1"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">全部人物角色</option>
                  {Object.entries(FIGURE_ROLE_META).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filterEra}
                onChange={(e) => setFilterEra(e.target.value)}
                className="rounded-lg border px-2 py-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">全部时代</option>
                {ERAS.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.shortName}
                  </option>
                ))}
              </select>

              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value as WorldRegion | 'all')}
                className="rounded-lg border px-2 py-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">全部区域</option>
                {Object.entries(REGION_META).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>

              <select
                value={filterDim}
                onChange={(e) => setFilterDim(e.target.value as Dimension | 'all')}
                className="rounded-lg border px-2 py-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">全部维度</option>
                {Object.entries(DIMENSION_META).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>

              <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
                匹配 {tab === 'figures' ? filteredFigures.length : filteredEvents.length} 项
              </span>
            </div>
          </div>

          {/* Results List */}
          <div className="atlas-scroll flex-1 overflow-y-auto p-3 space-y-2">
            {tab === 'search'
              ? filteredEvents.map((ev) => {
                  const dim = DIMENSION_META[ev.primaryDimension];
                  const color = theme === 'obsidian' ? dim.darkColor : dim.color;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        onSelectEvent(ev);
                        onClose();
                      }}
                      className="w-full flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition hover:opacity-90 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span
                            className="rounded px-1.5 py-0.5 font-semibold"
                            style={{ backgroundColor: dim.bgTint, color }}
                          >
                            {dim.shortLabel}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {ev.dateDisplay} · {REGION_META[ev.region].label}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-bold">{ev.title}</div>
                        <p className="mt-0.5 text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {ev.card.summary}
                        </p>
                      </div>
                    </button>
                  );
                })
              : filteredFigures.map((fig) => {
                  const roleMeta = FIGURE_ROLE_META[fig.role];
                  const roleColor = theme === 'obsidian' ? roleMeta.darkColor : roleMeta.color;
                  return (
                    <button
                      key={fig.id}
                      type="button"
                      onClick={() => {
                        onSelectFigure(fig);
                        onClose();
                      }}
                      className="w-full flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition hover:opacity-90 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: roleColor }}
                        >
                          {fig.monogram}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span
                              className="rounded px-1.5 py-0.5 font-semibold"
                              style={{ backgroundColor: roleMeta.bgTint, color: roleColor }}
                            >
                              {roleMeta.shortLabel}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {fig.lifespanDisplay} · {REGION_META[fig.region].label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-baseline gap-2">
                            <span className="text-sm font-bold">{fig.name}</span>
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {fig.title}
                            </span>
                          </div>
                          <p
                            className="mt-0.5 text-xs line-clamp-2"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {fig.card.oneLiner}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
