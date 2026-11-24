import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Crown,
  ExternalLink,
  Globe2,
  Landmark,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Moon,
  Mountain,
  Pause,
  Play,
  Quote,
  ScrollText,
  Search,
  Sparkles,
  Sun,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_PROFILES, findMatchingStageIndex } from '../data/countries';
import { DIMENSION_META, FIGURE_ROLE_META, REGION_META } from '../data/eras';
import type {
  CountryEvolutionProfile,
  CountrySnapshotEntry,
  HistoricalFigure,
  HistoryEvent,
  ProjectionMode,
  ResolvedCountryEvolution,
  ThemeMode,
} from '../types/history';
import { formatShortYear, formatYear } from '../utils/timeline';

type EvolutionTab = 'chronicle' | 'events' | 'figures' | 'ledger';

const REGION_ORDER: CountryEvolutionProfile['region'][] = [
  'east-asia',
  'south-asia',
  'middle-east',
  'europe',
  'africa',
  'americas',
];

interface CountryEvolutionHeaderProps {
  country: ResolvedCountryEvolution;
  currentYear: number;
  snapshotYear: number | null;
  projection: ProjectionMode;
  theme: ThemeMode;
  fullReading: boolean;
  onExit: () => void;
  onSelectCuratedCountry: (profileId: string) => void;
  onToggleFullReading: () => void;
  onToggleProjection: () => void;
  onToggleTheme: () => void;
}

export function CountryEvolutionHeader({
  country,
  currentYear,
  snapshotYear,
  projection,
  theme,
  fullReading,
  onExit,
  onSelectCuratedCountry,
  onToggleFullReading,
  onToggleProjection,
  onToggleTheme,
}: CountryEvolutionHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [pickerOpen]);

  const activeLedgerEntry = useMemo(() => {
    if (country.snapshotLedger.length === 0) return null;
    const yr = snapshotYear ?? currentYear;
    let chosen = country.snapshotLedger[0];
    let bestDist = Math.abs(yr - chosen.year);
    for (const item of country.snapshotLedger) {
      const d = Math.abs(yr - item.year);
      if (d < bestDist || (d === bestDist && item.year <= yr)) {
        chosen = item;
        bestDist = d;
      }
    }
    return chosen;
  }, [country.snapshotLedger, snapshotYear, currentYear]);

  const filteredByRegion = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REGION_ORDER.map((region) => {
      const list = COUNTRY_PROFILES.filter((p) => {
        if (p.region !== region) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.enName.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q)
        );
      });
      return { region, label: REGION_META[region].label, items: list };
    }).filter((grp) => grp.items.length > 0);
  }, [query]);

  return (
    <header
      className="relative z-30 flex items-center justify-between gap-2 border-b px-3 py-2 md:px-4 md:py-2.5 backdrop-blur-md"
      style={{
        backgroundColor:
          theme === 'obsidian' ? 'rgba(20, 30, 43, 0.92)' : 'rgba(251, 248, 241, 0.94)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">返回世界全图</span>
          <span className="sm:hidden">全图</span>
        </button>

        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-sm text-white shadow-sm"
          style={{ backgroundColor: country.accentColor }}
        >
          {country.name.slice(0, 1)}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-sm md:text-base font-bold tracking-tight">
              {country.name} · 历史演变
            </h1>
            <span
              className="hidden md:inline text-xs truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {country.enName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] truncate">
            <span className="font-semibold shrink-0" style={{ color: country.accentColor }}>
              {formatYear(currentYear)}
            </span>
            {activeLedgerEntry && (
              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                · 当前版图：{activeLedgerEntry.zhName}（{formatShortYear(activeLedgerEntry.year)}）
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: country.accentColor }}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>切换国家</span>
          </button>

          {pickerOpen && (
            <div
              className="absolute right-0 top-10 z-50 w-[310px] sm:w-[370px] rounded-2xl border p-3 shadow-2xl"
              style={{
                backgroundColor: theme === 'obsidian' ? '#141E2B' : '#FBF8F1',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <div
                className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 mb-2.5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索国家名称（如 中国 / 法国 / 埃及）..."
                  className="w-full bg-transparent text-xs outline-none"
                  autoFocus
                />
              </div>

              <div className="atlas-scroll max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                {filteredByRegion.map((grp) => (
                  <div key={grp.region}>
                    <div
                      className="text-[11px] font-semibold mb-1.5 px-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {grp.label}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {grp.items.map((item) => {
                        const isCurrent = item.id === country.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectCuratedCountry(item.id);
                              setPickerOpen(false);
                              setQuery('');
                            }}
                            className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition hover:opacity-85 cursor-pointer"
                            style={{
                              backgroundColor: isCurrent
                                ? `${item.accentColor}22`
                                : 'var(--bg-elevated)',
                              borderColor: isCurrent ? item.accentColor : 'var(--border-subtle)',
                            }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.accentColor }}
                            />
                            <span className="font-semibold truncate">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredByRegion.length === 0 && (
                  <p className="py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    未找到匹配国家，也可以直接点击地图任意疆域查看演变。
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleFullReading}
          className="hidden lg:inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title={fullReading ? '恢复地图与通史分屏对照' : '收起地图全屏阅读国家脉络'}
        >
          {fullReading ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span>分屏对照</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>全屏阅读</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleProjection}
          className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border transition hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title={projection === 'globe' ? '切换 2D 平面地图' : '切换 3D 地球仪'}
          aria-label="切换地图投影"
        >
          <Globe2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          title={theme === 'obsidian' ? '切换古卷羊皮纸主题' : '切换深海夜览主题'}
          aria-label="切换色彩主题"
        >
          {theme === 'obsidian' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </header>
  );
}

interface CountryMapDockProps {
  country: ResolvedCountryEvolution;
  currentYear: number;
  isPlaying: boolean;
  theme: ThemeMode;
  onTogglePlay: () => void;
  onSelectYear: (year: number) => void;
}

export function CountryMapDock({
  country,
  currentYear,
  isPlaying,
  theme,
  onTogglePlay,
  onSelectYear,
}: CountryMapDockProps) {
  const activeStageIdx = useMemo(
    () => findMatchingStageIndex(country.stages, currentYear),
    [country.stages, currentYear],
  );

  const stepStage = (dir: -1 | 1) => {
    if (country.stages.length === 0) return;
    const nextIdx = Math.max(0, Math.min(country.stages.length - 1, activeStageIdx + dir));
    onSelectYear(country.stages[nextIdx].snapshotYear);
  };

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2.5 z-20 flex flex-col gap-1.5">
      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border px-2 py-1.5 shadow-xl backdrop-blur-md"
        style={{
          backgroundColor:
            theme === 'obsidian' ? 'rgba(18, 28, 40, 0.90)' : 'rgba(251, 248, 241, 0.92)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: country.accentColor }}
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          <span>{isPlaying ? '暂停演变' : '播放本国演变'}</span>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => stepStage(-1)}
            disabled={activeStageIdx <= 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition hover:opacity-80 disabled:opacity-35 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="上一历史阶段"
            aria-label="上一历史阶段"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => stepStage(1)}
            disabled={activeStageIdx >= country.stages.length - 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition hover:opacity-80 disabled:opacity-35 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="下一历史阶段"
            aria-label="下一历史阶段"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto pl-1">
          {country.stages.map((st, idx) => {
            const active = idx === activeStageIdx;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectYear(st.snapshotYear)}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition cursor-pointer"
                style={{
                  backgroundColor: active ? country.accentColor : 'var(--bg-muted)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
                title={`${st.periodDisplay} · ${st.name}`}
              >
                {formatShortYear(st.snapshotYear)} · {st.name.slice(0, 8)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TerritoryPulseChartProps {
  ledger: CountrySnapshotEntry[];
  currentYear: number;
  accentColor: string;
  theme: ThemeMode;
  onSelectYear: (year: number) => void;
}

function TerritoryPulseChart({
  ledger,
  currentYear,
  accentColor,
  theme,
  onSelectYear,
}: TerritoryPulseChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (ledger.length === 0) return null;
    const width = 560;
    const height = 148;
    const padLeft = 18;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 26;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const maxArea = Math.max(1, ...ledger.map((d) => d.area));

    const pts = ledger.map((d, i) => {
      const x =
        ledger.length === 1 ? padLeft + innerW / 2 : padLeft + (i / (ledger.length - 1)) * innerW;
      const normalized = Math.sqrt(Math.max(0.02, d.area) / maxArea);
      const y = padTop + innerH * (1 - normalized * 0.9);
      return { ...d, i, x, y };
    });

    const linePath = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padTop + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

    let activeIdx = 0;
    let bestDist = Math.abs(currentYear - pts[0].year);
    for (let i = 1; i < pts.length; i++) {
      const dist = Math.abs(currentYear - pts[i].year);
      if (dist < bestDist || (dist === bestDist && pts[i].year <= currentYear)) {
        bestDist = dist;
        activeIdx = i;
      }
    }

    const labelIndices = new Set<number>([
      0,
      Math.floor((pts.length - 1) * 0.25),
      Math.floor((pts.length - 1) * 0.5),
      Math.floor((pts.length - 1) * 0.75),
      pts.length - 1,
    ]);

    return { width, height, padTop, innerH, pts, linePath, areaPath, activeIdx, labelIndices };
  }, [ledger, currentYear]);

  if (!chartData) return null;

  const inspectItem = chartData.pts[hoveredIdx ?? chartData.activeIdx];

  return (
    <div
      className="rounded-xl border p-3"
      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Layers className="h-3.5 w-3.5" style={{ color: accentColor }} />
          <span>跨越 {ledger.length} 期疆域规模与政权更迭脉搏</span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: accentColor }}>
          {formatYear(inspectItem.year)} · {inspectItem.zhName}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full h-32 select-none"
        role="img"
        aria-label="国家历代疆域规模脉搏图"
      >
        <defs>
          <linearGradient id="countryPulseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.42" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <line
          x1="14"
          y1={chartData.padTop + chartData.innerH}
          x2={chartData.width - 14}
          y2={chartData.padTop + chartData.innerH}
          stroke={theme === 'obsidian' ? 'rgba(148,163,184,0.22)' : 'rgba(100,85,65,0.2)'}
          strokeWidth="1"
        />

        <path d={chartData.areaPath} fill="url(#countryPulseGrad)" />
        <path d={chartData.linePath} fill="none" stroke={accentColor} strokeWidth="2.2" />

        <line
          x1={chartData.pts[chartData.activeIdx].x}
          y1={chartData.padTop}
          x2={chartData.pts[chartData.activeIdx].x}
          y2={chartData.padTop + chartData.innerH}
          stroke={accentColor}
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.7"
        />

        {chartData.pts.map((pt, idx) => {
          const isActive = idx === chartData.activeIdx;
          const isHover = idx === hoveredIdx;
          return (
            <g key={pt.year}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive || isHover ? 5 : 2.8}
                fill={isActive ? '#FFFFFF' : accentColor}
                stroke={accentColor}
                strokeWidth={isActive ? 2.4 : 1}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectYear(pt.year)}
              />
              {chartData.labelIndices.has(idx) && (
                <text
                  x={pt.x}
                  y={chartData.height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill={theme === 'obsidian' ? '#94A3B8' : '#786853'}
                >
                  {formatShortYear(pt.year)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        纵轴表示该政权在当期历史地图截面中的相对控制疆域尺度（点击节点可立即定位至该年份版图）
      </p>
    </div>
  );
}

interface CountryEvolutionPanelProps {
  country: ResolvedCountryEvolution;
  currentYear: number;
  theme: ThemeMode;
  fullReading: boolean;
  onSelectYear: (year: number) => void;
  onSelectModernCountry: (modernKey: string) => void;
  onSelectEventInWorld: (ev: HistoryEvent) => void;
  onSelectFigureInWorld: (fig: HistoricalFigure) => void;
}

export function CountryEvolutionPanel({
  country,
  currentYear,
  theme,
  fullReading,
  onSelectYear,
  onSelectModernCountry,
  onSelectEventInWorld,
  onSelectFigureInWorld,
}: CountryEvolutionPanelProps) {
  const [tab, setTab] = useState<EvolutionTab>('chronicle');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    setTab('chronicle');
    setExpandedEventId(null);
  }, [country.id]);

  const activeStageIdx = useMemo(
    () => findMatchingStageIndex(country.stages, currentYear),
    [country.stages, currentYear],
  );

  const maxLedgerArea = useMemo(
    () => Math.max(1, ...country.snapshotLedger.map((s) => s.area)),
    [country.snapshotLedger],
  );

  return (
    <section
      className={
        fullReading
          ? 'flex-1 h-full overflow-hidden flex flex-col'
          : 'flex-1 lg:w-[48%] lg:max-w-[660px] h-full overflow-hidden flex flex-col'
      }
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Tab Navigation Bar */}
      <div
        className="flex items-center gap-1 border-b px-3 py-2 shrink-0 overflow-x-auto no-scrollbar"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
      >
        {(
          [
            { id: 'chronicle', label: '演进脉络' },
            { id: 'events', label: `重大史事 (${country.events.length})` },
            { id: 'figures', label: `历史人物 (${country.figures.length})` },
            { id: 'ledger', label: `版图实录 (${country.snapshotLedger.length})` },
          ] as { id: EvolutionTab; label: string }[]
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
              style={{
                backgroundColor: active ? country.accentColor : 'transparent',
                color: active ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Optional cross-border territorial alternative banner */}
      {country.localAlternative && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2 text-xs shrink-0"
          style={{
            backgroundColor: `${country.accentColor}14`,
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            您点击的政权「{country.clickedPolity?.zhName}」曾跨区统治此地，该坐标今属「
            <strong style={{ color: 'var(--text-primary)' }}>
              {country.localAlternative.zhName}
            </strong>
            」
          </span>
          <button
            type="button"
            onClick={() => onSelectModernCountry(country.localAlternative!.modernCountryKey)}
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: country.accentColor }}
          >
            切换查看「{country.localAlternative.zhName}」→
          </button>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="atlas-scroll flex-1 overflow-y-auto p-3.5 md:p-5 space-y-4">
        {tab === 'chronicle' && (
          <div className="space-y-4">
            {/* Intro Header */}
            <div
              className="rounded-xl border p-3.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: `${country.accentColor}55`,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    backgroundColor: `${country.accentColor}20`,
                    color: country.accentColor,
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  {country.isCurated ? '精编国别通史档案' : '全史 49 期切片重构档案'}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {REGION_META[country.region].label}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{country.tagline}</p>
            </div>

            {/* 2x2 Four-Dimension National Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  icon: <Mountain className="h-3.5 w-3.5" />,
                  title: '地理与地缘基因',
                  color: '#8C6D46',
                  body: country.overview.geography,
                },
                {
                  icon: <Landmark className="h-3.5 w-3.5" />,
                  title: '政制与国家结构',
                  color: DIMENSION_META.politics.color,
                  body: country.overview.politics,
                },
                {
                  icon: <Coins className="h-3.5 w-3.5" />,
                  title: '经济引擎与分工',
                  color: DIMENSION_META.economy.color,
                  body: country.overview.economy,
                },
                {
                  icon: <ScrollText className="h-3.5 w-3.5" />,
                  title: '文明认同与文化',
                  color: DIMENSION_META.culture.color,
                  body: country.overview.culture,
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border p-3 space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: card.color }}
                  >
                    {card.icon}
                    <span>{card.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Interactive SVG Territory Pulse Chart */}
            <TerritoryPulseChart
              ledger={country.snapshotLedger}
              currentYear={currentYear}
              accentColor={country.accentColor}
              theme={theme}
              onSelectYear={onSelectYear}
            />

            {/* Vertical Dynasty/Phase Evolution Timeline */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  朝代与历史阶段演进（{country.stages.length} 个阶段）
                </h3>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  点击卡片可定位当期版图
                </span>
              </div>

              {country.stages.map((st, idx) => {
                const isActive = idx === activeStageIdx;
                return (
                  <div
                    key={st.id}
                    className="rounded-xl border p-3.5 transition"
                    style={{
                      backgroundColor: isActive ? `${country.accentColor}12` : 'var(--bg-elevated)',
                      borderColor: isActive ? country.accentColor : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{
                            backgroundColor: isActive ? country.accentColor : 'var(--text-muted)',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold">{st.name}</span>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: 'var(--bg-muted)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {st.periodDisplay}
                            </span>
                          </div>
                          {st.capital && (
                            <div
                              className="mt-0.5 flex items-center gap-1 text-[11px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <Crown className="h-3 w-3" />
                              <span>核心都城 / 枢纽：{st.capital}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectYear(st.snapshotYear)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-90 cursor-pointer shrink-0"
                        style={{
                          backgroundColor: isActive ? country.accentColor : 'var(--bg-surface)',
                          color: isActive ? '#FFFFFF' : country.accentColor,
                          border: `1px solid ${country.accentColor}`,
                        }}
                      >
                        <Compass className="h-3 w-3" />
                        <span>定位 {formatShortYear(st.snapshotYear)} 版图</span>
                      </button>
                    </div>

                    <p
                      className="mt-2 text-xs leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {st.summary}
                    </p>

                    <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[11px]">
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: DIMENSION_META.politics.color }}>政制：</strong>
                        {st.politics}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: DIMENSION_META.economy.color }}>经济：</strong>
                        {st.economy}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: DIMENSION_META.culture.color }}>文化：</strong>
                        {st.culture}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-3">
            {country.events.length === 0 ? (
              <div
                className="rounded-xl border p-6 text-center text-xs"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                该地区暂无直接标注的重点事件卡片，可在世界全图中查看周边区域历史事件。
              </div>
            ) : (
              country.events.map((ev) => {
                const dim = DIMENSION_META[ev.primaryDimension];
                const isOpen = expandedEventId === ev.id;
                return (
                  <div
                    key={ev.id}
                    className="rounded-xl border p-3.5 space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] mb-1">
                          <span
                            className="rounded-full px-2 py-0.5 font-semibold text-white"
                            style={{ backgroundColor: dim.color }}
                          >
                            {dim.label}
                          </span>
                          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {ev.dateDisplay}
                          </span>
                          <span
                            className="inline-flex items-center gap-0.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <MapPin className="h-3 w-3" />
                            {ev.locationName}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold">{ev.title}</h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectYear(ev.year)}
                          className="rounded-lg border px-2 py-1 text-[11px] font-medium hover:opacity-80 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          在当前页看 {formatShortYear(ev.year)} 版图
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectEventInWorld(ev)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer"
                          style={{ backgroundColor: country.accentColor }}
                        >
                          <span>世界全图卡片</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {ev.card.summary}
                    </p>

                    <button
                      type="button"
                      onClick={() => setExpandedEventId(isOpen ? null : ev.id)}
                      className="text-[11px] font-semibold hover:underline cursor-pointer"
                      style={{ color: country.accentColor }}
                    >
                      {isOpen ? '收起多维结构解析 ↑' : '展开政治 / 经济 / 文化 / 历史影响 ↓'}
                    </button>

                    {isOpen && (
                      <div
                        className="mt-2 space-y-1.5 rounded-lg border p-2.5 text-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>地缘条件：</strong>
                          {ev.card.geography}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>政治博弈：</strong>
                          {ev.card.politics}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>经济引擎：</strong>
                          {ev.card.economy}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>文化影响：</strong>
                          {ev.card.culture}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>长远后果：</strong>
                          {ev.card.consequence}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'figures' && (
          <div className="space-y-3">
            {country.figures.length === 0 ? (
              <div
                className="rounded-xl border p-6 text-center text-xs"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                该国家/区域尚无直接收录的关键人物档案。
              </div>
            ) : (
              country.figures.map((fig) => {
                const role = FIGURE_ROLE_META[fig.role];
                return (
                  <div
                    key={fig.id}
                    className="rounded-xl border p-3.5 space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {fig.monogram}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold">{fig.name}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: role.bgTint, color: role.color }}
                            >
                              {role.label}
                            </span>
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {fig.title} · {fig.lifespanDisplay}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectFigureInWorld(fig)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer shrink-0"
                        style={{ backgroundColor: role.color }}
                      >
                        <UserRound className="h-3 w-3" />
                        <span>世界全图档案</span>
                      </button>
                    </div>

                    <p className="text-xs leading-relaxed">{fig.card.oneLiner}</p>

                    {fig.card.famousQuote && (
                      <div
                        className="flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] italic"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: role.color }} />
                        <span>“{fig.card.famousQuote}”</span>
                      </div>
                    )}

                    <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>核心建树：</strong>
                      {fig.card.coreContributions}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'ledger' && (
          <div className="space-y-2">
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              基于 49 期历史地图几何切片自动提取，展示本国地理中心在不同历史年份的政权隶属与疆域规模对比（点击任一行可跳转地图至对应截面）：
            </div>

            {country.snapshotLedger.map((row) => {
              const isNearest =
                Math.abs(row.year - currentYear) ===
                Math.min(...country.snapshotLedger.map((r) => Math.abs(r.year - currentYear)));
              const widthPct = Math.max(6, Math.round((row.area / maxLedgerArea) * 100));
              return (
                <button
                  key={`${row.year}-${row.enName}`}
                  type="button"
                  onClick={() => onSelectYear(row.year)}
                  className="w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:opacity-85 cursor-pointer"
                  style={{
                    backgroundColor: isNearest ? `${country.accentColor}16` : 'var(--bg-elevated)',
                    borderColor: isNearest ? country.accentColor : 'var(--border-subtle)',
                  }}
                >
                  <span
                    className="w-16 shrink-0 text-xs font-bold tabular-nums"
                    style={{ color: isNearest ? country.accentColor : 'var(--text-primary)' }}
                  >
                    {formatShortYear(row.year)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">{row.zhName}</span>
                      {row.enName !== row.zhName && (
                        <span
                          className="hidden sm:inline truncate text-[10px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {row.enName}
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: 'var(--bg-muted)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: country.accentColor,
                          opacity: isNearest ? 1 : 0.65,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
