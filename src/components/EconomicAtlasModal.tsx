import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Coins,
  Globe2,
  Landmark,
  ShieldAlert,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { COUNTRY_PROFILE_MAP, COUNTRY_PROFILES } from '../data/countries';
import { COUNTRY_ECON_BENCHMARK_YEARS, COUNTRY_ECONOMIC_PROFILES } from '../data/countryEconomics';
import {
  FINANCIAL_CRISES_CATALOG,
  GLOBAL_ECON_BENCHMARKS,
  GLOBAL_ECON_REGION_META,
  GLOBAL_MACRO_REGION_KEYS,
  MONETARY_REGIMES,
  findNearestEconBenchmark,
} from '../data/economicHistory';
import { EVENT_MAP } from '../data/events';
import type { GlobalMacroRegionKey, HistoryEvent, ThemeMode } from '../types/history';
import { formatShortYear } from '../utils/timeline';

type AtlasTab = 'macro' | 'monetary' | 'crises' | 'ranking';
type RankingMetric = 'gdpSharePct' | 'gdpPerCapitaPPP' | 'populationM';

interface EconomicAtlasModalProps {
  open: boolean;
  currentYear: number;
  theme: ThemeMode;
  onClose: () => void;
  onJumpToYear: (year: number) => void;
  onSelectEvent: (ev: HistoryEvent) => void;
  onSelectCountry: (countryId: string) => void;
}

const PITCH_SERIES_LINES: Array<{
  key: 'usa' | 'westernEurope' | 'japan' | 'china' | 'india' | 'world';
  label: string;
  color: string;
  dashed?: boolean;
}> = [
  { key: 'usa', label: '美国', color: '#3B5BA9' },
  { key: 'westernEurope', label: '西欧', color: '#2E6F9E' },
  { key: 'japan', label: '日本', color: '#B05372' },
  { key: 'china', label: '中国', color: '#C84E45' },
  { key: 'india', label: '印度', color: '#E07A38' },
  { key: 'world', label: '世界均值', color: '#8C6D46', dashed: true },
];

function formatNumberCompact(val: number): string {
  if (val >= 10000) return `${(val / 10000).toFixed(2)} 万`;
  return val.toLocaleString('en-US');
}

export function EconomicAtlasModal({
  open,
  currentYear,
  theme,
  onClose,
  onJumpToYear,
  onSelectEvent,
  onSelectCountry,
}: EconomicAtlasModalProps) {
  const [tab, setTab] = useState<AtlasTab>('macro');
  const [selectedBenchYear, setSelectedBenchYear] = useState<number>(() =>
    findNearestEconBenchmark(currentYear).year,
  );
  const [logScale, setLogScale] = useState<boolean>(true);
  const [crisisSeverity, setCrisisSeverity] = useState<'all' | 1 | 2 | 3>('all');
  const [rankingYear, setRankingYear] = useState<number>(2024);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('gdpSharePct');

  useEffect(() => {
    if (!open) return;
    setSelectedBenchYear(findNearestEconBenchmark(currentYear).year);
    const nearestRank = COUNTRY_ECON_BENCHMARK_YEARS.reduce((best, yr) =>
      Math.abs(yr - currentYear) < Math.abs(best - currentYear) ? yr : best,
    );
    setRankingYear(nearestRank);
  }, [open, currentYear]);

  const activeBenchmark = useMemo(
    () =>
      GLOBAL_ECON_BENCHMARKS.find((b) => b.year === selectedBenchYear) || GLOBAL_ECON_BENCHMARKS[0],
    [selectedBenchYear],
  );

  // Stacked area geometry (16 x columns)
  const stackedAreaData = useMemo(() => {
    const W = 680;
    const H = 220;
    const padL = 38;
    const padR = 16;
    const padT = 14;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = GLOBAL_ECON_BENCHMARKS.length;
    const xAt = (idx: number) => padL + (idx / Math.max(1, n - 1)) * plotW;

    const layers: Array<{ key: GlobalMacroRegionKey; d: string; color: string; label: string }> = [];
    const accumBottom = new Array<number>(n).fill(0);

    for (const regionKey of GLOBAL_MACRO_REGION_KEYS) {
      const topPts: Array<[number, number]> = [];
      const botPts: Array<[number, number]> = [];

      for (let i = 0; i < n; i++) {
        const share = GLOBAL_ECON_BENCHMARKS[i].gdpSharePct[regionKey] ?? 0;
        const yBotPct = accumBottom[i];
        const yTopPct = Math.min(100, yBotPct + share);
        accumBottom[i] = yTopPct;

        const x = xAt(i);
        const yTop = padT + plotH * (1 - yTopPct / 100);
        const yBot = padT + plotH * (1 - yBotPct / 100);
        topPts.push([x, yTop]);
        botPts.push([x, yBot]);
      }

      const dTop = topPts.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
      const dBot = botPts
        .slice()
        .reverse()
        .map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`)
        .join(' ');
      const meta = GLOBAL_ECON_REGION_META[regionKey];
      layers.push({
        key: regionKey,
        d: `${dTop} ${dBot} Z`,
        color: meta.color,
        label: meta.label,
      });
    }

    const activeIdx = Math.max(
      0,
      GLOBAL_ECON_BENCHMARKS.findIndex((b) => b.year === activeBenchmark.year),
    );
    return { W, H, padL, padR, padT, padB, plotW, plotH, layers, xAt, activeIdx };
  }, [activeBenchmark.year]);

  // Great Divergence line chart geometry
  const divergenceData = useMemo(() => {
    const W = 680;
    const H = 220;
    const padL = 52;
    const padR = 16;
    const padT = 14;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = GLOBAL_ECON_BENCHMARKS.length;
    const xAt = (idx: number) => padL + (idx / Math.max(1, n - 1)) * plotW;

    const minVal = 400;
    const maxVal = 65000;
    const yAt = (val: number) => {
      const clamped = Math.max(minVal, Math.min(maxVal, val));
      const ratio = logScale
        ? (Math.log10(clamped) - Math.log10(minVal)) / (Math.log10(maxVal) - Math.log10(minVal))
        : (clamped - 0) / maxVal;
      return padT + plotH * (1 - ratio);
    };

    const yTicks = logScale ? [500, 1000, 3000, 10000, 30000, 60000] : [10000, 25000, 40000, 55000];
    const paths = PITCH_SERIES_LINES.map((line) => {
      const pts = GLOBAL_ECON_BENCHMARKS.map((b, i) => [xAt(i), yAt(b.gdpPerCapitaPPP[line.key])] as [number, number]);
      const d = pts.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
      return { ...line, d, pts };
    });

    const activeIdx = Math.max(
      0,
      GLOBAL_ECON_BENCHMARKS.findIndex((b) => b.year === activeBenchmark.year),
    );
    return { W, H, padL, padT, plotW, plotH, xAt, yAt, yTicks, paths, activeIdx };
  }, [logScale, activeBenchmark.year]);

  const filteredCrises = useMemo(() => {
    if (crisisSeverity === 'all') return FINANCIAL_CRISES_CATALOG;
    return FINANCIAL_CRISES_CATALOG.filter((c) => c.severity === crisisSeverity);
  }, [crisisSeverity]);

  const rankingRows = useMemo(() => {
    const rows = COUNTRY_PROFILES.map((c) => {
      const econ = COUNTRY_ECONOMIC_PROFILES[c.id];
      const pt =
        econ?.series.find((p) => p.year === rankingYear) ??
        econ?.series[econ.series.length - 1] ??
        null;
      const value = pt ? pt[rankingMetric] : 0;
      return {
        country: c,
        point: pt,
        value,
      };
    }).sort((a, b) => b.value - a.value);
    const maxVal = Math.max(1, rows[0]?.value ?? 1);
    return { rows, maxVal };
  }, [rankingYear, rankingMetric]);

  if (!open) return null;

  const isDark = theme === 'obsidian';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(12, 18, 26, 0.62)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: isDark ? '#131D29' : '#FBF8F1',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ backgroundColor: '#C5831F' }}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                世界经济史量化图谱 · 2000 年宏观格局、货币本位与金融危机
              </h2>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                基于 Maddison Project（2011 国际元 PPP）与当代可比数据，打通疆域、财税与长波周期
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭世界经济史图谱"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}
        >
          {(
            [
              { id: 'macro', label: '全球 GDP 与大分流', icon: <Activity className="h-3.5 w-3.5" /> },
              { id: 'monetary', label: '货币本位演进 (7 代)', icon: <Coins className="h-3.5 w-3.5" /> },
              { id: 'crises', label: `金融危机档案 (${FINANCIAL_CRISES_CATALOG.length})`, icon: <ShieldAlert className="h-3.5 w-3.5" /> },
              { id: 'ranking', label: '30 国经济实力排行', icon: <BarChart3 className="h-3.5 w-3.5" /> },
            ] as Array<{ id: AtlasTab; label: string; icon: ReactNode }>
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: active ? '#C5831F' : 'var(--bg-surface)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="atlas-scroll flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'macro' && (
            <div className="space-y-4">
              {/* Year Pills */}
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
                {GLOBAL_ECON_BENCHMARKS.map((b) => {
                  const active = b.year === activeBenchmark.year;
                  return (
                    <button
                      key={b.year}
                      type="button"
                      onClick={() => setSelectedBenchYear(b.year)}
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer"
                      style={{
                        backgroundColor: active ? '#C5831F' : 'var(--bg-surface)',
                        borderColor: active ? '#C5831F' : 'var(--border-subtle)',
                        color: active ? '#FFFFFF' : 'var(--text-secondary)',
                      }}
                    >
                      {b.year === 1 ? '公元 1 年' : `${b.year} 年`}
                    </button>
                  );
                })}
              </div>

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {activeBenchmark.label} · 全球总人口
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {activeBenchmark.worldPopulationM >= 1000
                      ? `${(activeBenchmark.worldPopulationM / 1000).toFixed(2)} 十亿`
                      : `${activeBenchmark.worldPopulationM} 百万`}
                  </div>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    世界总产值（2011 Int$ PPP）
                  </div>
                  <div className="mt-1 text-lg font-bold" style={{ color: '#C5831F' }}>
                    {activeBenchmark.worldGdpBillionPPP >= 1000
                      ? `$${(activeBenchmark.worldGdpBillionPPP / 1000).toFixed(2)} 万亿`
                      : `$${activeBenchmark.worldGdpBillionPPP} 十亿`}
                  </div>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    全球人均 GDP & 贸易开放度
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    ${activeBenchmark.worldGdpPerCapitaPPP.toLocaleString('en-US')}{' '}
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      · 贸易 {activeBenchmark.tradeOpennessPct}%
                    </span>
                  </div>
                </div>
                <div
                  className="rounded-xl border p-3 flex flex-col justify-between gap-1"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      主导货币体系
                    </div>
                    <div className="mt-0.5 text-xs font-semibold leading-snug">
                      {activeBenchmark.monetaryRegime}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToYear(activeBenchmark.year);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 self-start text-[11px] font-semibold hover:underline cursor-pointer"
                    style={{ color: '#C5831F' }}
                  >
                    <span>在世界地图看 {activeBenchmark.year} 年疆域</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Benchmark Insight Banner */}
              <div
                className="rounded-xl border p-3 text-xs leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                style={{
                  backgroundColor: isDark ? 'rgba(197, 131, 31, 0.12)' : 'rgba(197, 131, 31, 0.09)',
                  borderColor: 'rgba(197, 131, 31, 0.35)',
                }}
              >
                <div>
                  <span className="font-bold" style={{ color: '#C5831F' }}>
                    核心格局（{activeBenchmark.dominantEconomy}）：
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{activeBenchmark.keyShift}</span>
                </div>
              </div>

              {/* Chart 1: Global GDP Share Stacked Area Chart */}
              <div
                className="rounded-xl border p-3.5 space-y-2.5"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold">
                      各经济板块占全球 GDP 比重变迁（公元 1 — 2024 年，%）
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      直观呈现“亚洲长期占全球过半 → 西方工业化占比冲顶 → 现代亚洲大趋同回归”结构钟摆
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    {GLOBAL_MACRO_REGION_KEYS.map((rk) => (
                      <span key={rk} className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: GLOBAL_ECON_REGION_META[rk].color }}
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {GLOBAL_ECON_REGION_META[rk].shortLabel} {activeBenchmark.gdpSharePct[rk]}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${stackedAreaData.W} ${stackedAreaData.H}`}
                  className="w-full h-auto select-none"
                >
                  {[25, 50, 75, 100].map((pct) => {
                    const y = stackedAreaData.padT + stackedAreaData.plotH * (1 - pct / 100);
                    return (
                      <g key={pct}>
                        <line
                          x1={stackedAreaData.padL}
                          x2={stackedAreaData.W - stackedAreaData.padR}
                          y1={y}
                          y2={y}
                          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                          strokeDasharray="3 3"
                        />
                        <text
                          x={stackedAreaData.padL - 5}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill={isDark ? '#8FA2B8' : '#7A6F62'}
                        >
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  {stackedAreaData.layers.map((layer) => (
                    <path key={layer.key} d={layer.d} fill={layer.color} fillOpacity={0.86} />
                  ))}

                  {/* Vertical active marker */}
                  <line
                    x1={stackedAreaData.xAt(stackedAreaData.activeIdx)}
                    x2={stackedAreaData.xAt(stackedAreaData.activeIdx)}
                    y1={stackedAreaData.padT}
                    y2={stackedAreaData.padT + stackedAreaData.plotH}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  {/* Clickable X-axis tick columns */}
                  {GLOBAL_ECON_BENCHMARKS.map((b, idx) => {
                    const x = stackedAreaData.xAt(idx);
                    const showLabel = idx % 2 === 0 || b.year === activeBenchmark.year;
                    return (
                      <g
                        key={b.year}
                        className="cursor-pointer"
                        onClick={() => setSelectedBenchYear(b.year)}
                      >
                        <rect
                          x={x - 16}
                          y={stackedAreaData.padT}
                          width={32}
                          height={stackedAreaData.plotH + 24}
                          fill="transparent"
                        />
                        {showLabel && (
                          <text
                            x={x}
                            y={stackedAreaData.H - 7}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight={b.year === activeBenchmark.year ? '700' : '500'}
                            fill={
                              b.year === activeBenchmark.year
                                ? '#C5831F'
                                : isDark
                                  ? '#9DB0C4'
                                  : '#6E6458'
                            }
                          >
                            {b.year}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Chart 2: Great Divergence Per-Capita GDP PPP */}
              <div
                className="rounded-xl border p-3.5 space-y-2.5"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold">
                      “大分流”与“大趋同”：主要经济体人均 GDP 轨迹（2011 Int$ PPP）
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      公元 1–1700 年亚欧人均收入长期在 $700–$1,600 区间徘徊；工业革命后欧美日飙升而中印在 1978/1991 后快速追赶
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLogScale((v) => !v)}
                    className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {logScale ? '对数纵轴 (Log)' : '线性纵轴 (Linear)'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  {PITCH_SERIES_LINES.map((line) => (
                    <span key={line.key} className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-4 rounded-full"
                        style={{
                          backgroundColor: line.color,
                          opacity: line.dashed ? 0.7 : 1,
                        }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {line.label}: ${formatNumberCompact(activeBenchmark.gdpPerCapitaPPP[line.key])}
                      </span>
                    </span>
                  ))}
                </div>

                <svg
                  viewBox={`0 0 ${divergenceData.W} ${divergenceData.H}`}
                  className="w-full h-auto select-none"
                >
                  {divergenceData.yTicks.map((tv) => {
                    const y = divergenceData.yAt(tv);
                    return (
                      <g key={tv}>
                        <line
                          x1={divergenceData.padL}
                          x2={divergenceData.W - 16}
                          y1={y}
                          y2={y}
                          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                          strokeDasharray="3 3"
                        />
                        <text
                          x={divergenceData.padL - 6}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill={isDark ? '#8FA2B8' : '#7A6F62'}
                        >
                          ${tv >= 1000 ? `${tv / 1000}k` : tv}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    x1={divergenceData.xAt(divergenceData.activeIdx)}
                    x2={divergenceData.xAt(divergenceData.activeIdx)}
                    y1={divergenceData.padT}
                    y2={divergenceData.padT + divergenceData.plotH}
                    stroke="#C5831F"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                  />

                  {divergenceData.paths.map((p) => (
                    <g key={p.key}>
                      <path
                        d={p.d}
                        fill="none"
                        stroke={p.color}
                        strokeWidth={p.dashed ? 1.5 : 2.2}
                        strokeDasharray={p.dashed ? '4 3' : undefined}
                      />
                      <circle
                        cx={p.pts[divergenceData.activeIdx][0]}
                        cy={p.pts[divergenceData.activeIdx][1]}
                        r={3.5}
                        fill={p.color}
                      />
                    </g>
                  ))}

                  {GLOBAL_ECON_BENCHMARKS.map((b, idx) => {
                    const x = divergenceData.xAt(idx);
                    const showLabel = idx % 2 === 0 || b.year === activeBenchmark.year;
                    return (
                      <g
                        key={b.year}
                        className="cursor-pointer"
                        onClick={() => setSelectedBenchYear(b.year)}
                      >
                        <rect
                          x={x - 16}
                          y={divergenceData.padT}
                          width={32}
                          height={divergenceData.plotH + 24}
                          fill="transparent"
                        />
                        {showLabel && (
                          <text
                            x={x}
                            y={divergenceData.H - 7}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight={b.year === activeBenchmark.year ? '700' : '500'}
                            fill={
                              b.year === activeBenchmark.year
                                ? '#C5831F'
                                : isDark
                                  ? '#9DB0C4'
                                  : '#6E6458'
                            }
                          >
                            {b.year}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {tab === 'monetary' && (
            <div className="space-y-3">
              {/* Visual Epoch Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {MONETARY_REGIMES.map((reg, i) => (
                  <div
                    key={reg.id}
                    className="rounded-lg border p-2 text-[11px]"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: `${reg.accentColor}66`,
                    }}
                  >
                    <div className="font-bold truncate" style={{ color: reg.accentColor }}>
                      {i + 1}. {reg.periodLabel}
                    </div>
                    <div className="mt-0.5 font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {reg.name}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MONETARY_REGIMES.map((reg, idx) => {
                  const midYear = Math.round((reg.startYear + reg.endYear) / 2);
                  return (
                    <div
                      key={reg.id}
                      className="rounded-xl border p-3.5 space-y-2 flex flex-col justify-between"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: reg.accentColor }}
                            >
                              第 {idx + 1} 代 · {reg.periodLabel}
                            </span>
                            <h3 className="mt-1 text-sm font-bold">{reg.name}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onJumpToYear(midYear);
                              onClose();
                            }}
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold hover:opacity-85 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: reg.accentColor,
                            }}
                          >
                            <span>看 {formatShortYear(midYear)}</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="space-y-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>核心锚定：</strong>
                            {reg.anchorAsset}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>枢纽中心：</strong>
                            {reg.coreCenter}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>清算机制：</strong>
                            {reg.settlementMechanism}
                          </div>
                          <div>
                            <strong style={{ color: '#2F855A' }}>历史优势：</strong>
                            {reg.strength}
                          </div>
                          <div>
                            <strong style={{ color: '#B83B3B' }}>致命脆弱点：</strong>
                            {reg.vulnerability}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'crises' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: `全部危机 (${FINANCIAL_CRISES_CATALOG.length})` },
                      { id: 3, label: '系统级冲击 (Ⅲ)' },
                      { id: 2, label: '区域/跨国危机 (Ⅱ)' },
                      { id: 1, label: '局部泡沫出清 (Ⅰ)' },
                    ] as Array<{ id: 'all' | 1 | 2 | 3; label: string }>
                  ).map((f) => {
                    const active = crisisSeverity === f.id;
                    return (
                      <button
                        key={String(f.id)}
                        type="button"
                        onClick={() => setCrisisSeverity(f.id)}
                        className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer"
                        style={{
                          backgroundColor: active ? '#B83B3B' : 'var(--bg-surface)',
                          borderColor: active ? '#B83B3B' : 'var(--border-subtle)',
                          color: active ? '#FFFFFF' : 'var(--text-secondary)',
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  危机永远倒逼监管与央行工具革新：点击卡片可直达相关历史事件卡
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCrises.map((c) => {
                  const linkedEvent = c.relatedEventId ? EVENT_MAP[c.relatedEventId] : null;
                  const sevLabel = c.severity === 3 ? '系统级' : c.severity === 2 ? '跨国级' : '局部级';
                  const sevColor = c.severity === 3 ? '#B83B3B' : c.severity === 2 ? '#C5831F' : '#296B9E';
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border p-3.5 space-y-2 flex flex-col justify-between"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                              <span
                                className="rounded px-1.5 py-0.5 text-white"
                                style={{ backgroundColor: sevColor }}
                              >
                                <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5" />
                                {sevLabel}
                              </span>
                              <span style={{ color: sevColor }}>{c.yearDisplay}</span>
                              <span style={{ color: 'var(--text-muted)' }}>· {c.epicenter}</span>
                            </div>
                            <h3 className="mt-1 text-sm font-bold">{c.name}</h3>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>导火索：</strong>
                            {c.trigger}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>传导机制：</strong>
                            {c.mechanism}
                          </div>
                          <div>
                            <strong style={{ color: '#B83B3B' }}>峰值冲击：</strong>
                            {c.peakImpact}
                          </div>
                          <div>
                            <strong style={{ color: '#2E6F9E' }}>政策应对：</strong>
                            {c.policyResponse}
                          </div>
                          <div>
                            <strong style={{ color: '#2F855A' }}>制度遗产：</strong>
                            {c.institutionalLegacy}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToYear(c.year);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium hover:opacity-85 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span>定位 {c.year} 年地图</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                        {linkedEvent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEvent(linkedEvent);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: '#C5831F' }}
                          >
                            <span>精读：{linkedEvent.title}</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'ranking' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
                  {COUNTRY_ECON_BENCHMARK_YEARS.map((yr) => {
                    const active = rankingYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setRankingYear(yr)}
                        className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                        style={{
                          backgroundColor: active ? '#C5831F' : 'var(--bg-surface)',
                          borderColor: active ? '#C5831F' : 'var(--border-subtle)',
                          color: active ? '#FFFFFF' : 'var(--text-secondary)',
                        }}
                      >
                        {yr === 1 ? 'AD 1' : yr}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'gdpSharePct', label: '占全球 GDP 比重 (%)' },
                      { id: 'gdpPerCapitaPPP', label: '人均 GDP (PPP)' },
                      { id: 'populationM', label: '人口规模 (百万)' },
                    ] as Array<{ id: RankingMetric; label: string }>
                  ).map((m) => {
                    const active = rankingMetric === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRankingMetric(m.id)}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                        style={{
                          backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-surface)',
                          borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          color: active ? '#FFFFFF' : 'var(--text-secondary)',
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-xl border divide-y"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {rankingRows.rows.map(({ country, point, value }, idx) => {
                  const pct = Math.max(2, (value / rankingRows.maxVal) * 100);
                  const displayVal =
                    rankingMetric === 'gdpSharePct'
                      ? `${value.toFixed(2)}%`
                      : rankingMetric === 'gdpPerCapitaPPP'
                        ? `$${value.toLocaleString('en-US')}`
                        : value >= 100
                          ? `${Math.round(value)} M`
                          : `${value.toFixed(1)} M`;
                  const hasProfile = Boolean(COUNTRY_PROFILE_MAP[country.id]);

                  return (
                    <div
                      key={country.id}
                      onClick={() => hasProfile && onSelectCountry(country.id)}
                      className="flex items-center gap-3 px-3.5 py-2 text-xs hover:opacity-85 transition cursor-pointer"
                      style={{ borderColor: 'var(--border-subtle)' }}
                      title={`点击进入「${country.name}」国别经济档案与疆域演变`}
                    >
                      <span
                        className="w-5 text-right font-bold shrink-0"
                        style={{ color: idx < 3 ? '#C5831F' : 'var(--text-muted)' }}
                      >
                        {idx + 1}
                      </span>

                      <div className="w-28 sm:w-36 flex items-center gap-1.5 shrink-0 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: country.accentColor }}
                        />
                        <span className="font-bold truncate">{country.name}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className="h-2.5 w-full rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-muted)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: country.accentColor,
                            }}
                          />
                        </div>
                        {point?.note && (
                          <div
                            className="mt-0.5 text-[10px] truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {point.note}
                          </div>
                        )}
                      </div>

                      <div className="w-20 text-right font-semibold shrink-0">{displayVal}</div>

                      <Globe2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Methodology Footnote */}
          <div
            className="rounded-lg border px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              数据口径说明：历史基准参照 Maddison Project Database（2011 国际元购买力平价 PPP），当代数据衔接 IMF/World Bank 最新可比估算；公元 1820 年前为历史学家定量重建区间估测。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
