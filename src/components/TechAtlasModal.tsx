import {
  Activity,
  ArrowUpRight,
  Cpu,
  Globe2,
  Landmark,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { COUNTRY_PROFILE_MAP, COUNTRY_PROFILES } from '../data/countries';
import { ERAS, REGION_META } from '../data/eras';
import { ALL_EVENTS, EVENT_MAP } from '../data/events';
import {
  TECH_PROGRESS_BENCHMARKS,
  TECH_REVOLUTION_WAVES,
  findNearestTechBenchmark,
} from '../data/techHistory';
import type { HistoryEvent, LiveIndicatorsPayload, ThemeMode } from '../types/history';
import { formatShortYear } from '../utils/timeline';

type TechTab = 'metrics' | 'waves' | 'live' | 'milestones';
type LiveMetricKey =
  | 'rndPctGdp'
  | 'highTechExportsPct'
  | 'internetPct'
  | 'renewableEnergyPct'
  | 'gdpPerCapitaPPP';

interface TechAtlasModalProps {
  open: boolean;
  currentYear: number;
  theme: ThemeMode;
  onClose: () => void;
  onJumpToYear: (year: number) => void;
  onSelectEvent: (ev: HistoryEvent) => void;
  onSelectCountry: (countryId: string) => void;
}

const LIVE_METRIC_OPTIONS: Array<{
  key: LiveMetricKey;
  label: string;
  unit: string;
  color: string;
  desc: string;
}> = [
  {
    key: 'rndPctGdp',
    label: '研发投入 R&D (% GDP)',
    unit: '%',
    color: '#296B9E',
    desc: '研发经费占国内生产总值比重，衡量科技基础研究与工程投入强度',
  },
  {
    key: 'highTechExportsPct',
    label: '高科技制造出口占比 (%)',
    unit: '%',
    color: '#734B9B',
    desc: '航空航天、计算机芯片、制药、科学仪器等研发密集型商品占制成品出口比重',
  },
  {
    key: 'internetPct',
    label: '互联网普及率 (%)',
    unit: '%',
    color: '#2E7D6B',
    desc: '接入全球互联网网络的人口覆盖率',
  },
  {
    key: 'renewableEnergyPct',
    label: '可再生能源占终端能耗比 (%)',
    unit: '%',
    color: '#D97706',
    desc: '水电、风电、光伏及生物质能占全国最终能源消费比重',
  },
  {
    key: 'gdpPerCapitaPPP',
    label: '实时人均 GDP (PPP 现价基准)',
    unit: '$',
    color: '#C5831F',
    desc: '世界银行最新可比购买力平价人均国内生产总值（常数国际元）',
  },
];

export function TechAtlasModal({
  open,
  currentYear,
  theme,
  onClose,
  onJumpToYear,
  onSelectEvent,
  onSelectCountry,
}: TechAtlasModalProps) {
  const [tab, setTab] = useState<TechTab>('metrics');
  const [selectedBenchYear, setSelectedBenchYear] = useState<number>(() =>
    findNearestTechBenchmark(currentYear).year,
  );
  const [liveData, setLiveData] = useState<LiveIndicatorsPayload | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveMetric, setLiveMetric] = useState<LiveMetricKey>('rndPctGdp');
  const [milestoneEra, setMilestoneEra] = useState<string>('all');
  const [milestoneQuery, setMilestoneQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedBenchYear(findNearestTechBenchmark(currentYear).year);
  }, [open, currentYear]);

  useEffect(() => {
    if (!open || liveData || liveLoading) return;
    let cancelled = false;
    setLiveLoading(true);
    setLiveError(null);
    fetch(`${import.meta.env.BASE_URL}data/live-indicators.json?v=${encodeURIComponent(__DATA_VERSION__)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as LiveIndicatorsPayload;
      })
      .then((json) => {
        if (!cancelled) setLiveData(json);
      })
      .catch((err) => {
        if (!cancelled) setLiveError(err instanceof Error ? err.message : '加载实时数据失败');
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, liveData, liveLoading]);

  const activeBenchmark = useMemo(
    () =>
      TECH_PROGRESS_BENCHMARKS.find((b) => b.year === selectedBenchYear) ||
      TECH_PROGRESS_BENCHMARKS[0],
    [selectedBenchYear],
  );

  // SVG Chart 1: Life Expectancy & Literacy
  const healthLiteracyChart = useMemo(() => {
    const W = 680;
    const H = 205;
    const padL = 42;
    const padR = 16;
    const padT = 14;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = TECH_PROGRESS_BENCHMARKS.length;
    const xAt = (i: number) => padL + (i / Math.max(1, n - 1)) * plotW;
    const yAtPct = (val: number) => padT + plotH * (1 - Math.min(100, Math.max(0, val)) / 100);

    const lifePts = TECH_PROGRESS_BENCHMARKS.map(
      (b, i) => [xAt(i), yAtPct(b.lifeExpectancyYears)] as [number, number],
    );
    const litPts = TECH_PROGRESS_BENCHMARKS.map(
      (b, i) => [xAt(i), yAtPct(b.globalLiteracyPct)] as [number, number],
    );
    const toPath = (pts: Array<[number, number]>) =>
      pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

    const activeIdx = Math.max(
      0,
      TECH_PROGRESS_BENCHMARKS.findIndex((b) => b.year === activeBenchmark.year),
    );
    return {
      W,
      H,
      padL,
      padT,
      plotW,
      plotH,
      xAt,
      yAtPct,
      lifePath: toPath(lifePts),
      litPath: toPath(litPts),
      lifePts,
      litPts,
      activeIdx,
    };
  }, [activeBenchmark.year]);

  // SVG Chart 2: Energy & Computing Log10
  const energyComputeChart = useMemo(() => {
    const W = 680;
    const H = 205;
    const padL = 48;
    const padR = 16;
    const padT = 14;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const n = TECH_PROGRESS_BENCHMARKS.length;
    const xAt = (i: number) => padL + (i / Math.max(1, n - 1)) * plotW;

    const yEnergyAt = (kwh: number) => padT + plotH * (1 - Math.min(72, kwh) / 72);
    const yComputeAt = (log10Val: number) =>
      padT + plotH * (1 - (Math.max(-2, Math.min(19, log10Val)) + 2) / 21);

    const energyPts = TECH_PROGRESS_BENCHMARKS.map(
      (b, i) => [xAt(i), yEnergyAt(b.energyPerCapitaKwhDay)] as [number, number],
    );
    const compPts = TECH_PROGRESS_BENCHMARKS.map(
      (b, i) => [xAt(i), yComputeAt(b.computeFlopsLog10)] as [number, number],
    );
    const toPath = (pts: Array<[number, number]>) =>
      pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

    const activeIdx = Math.max(
      0,
      TECH_PROGRESS_BENCHMARKS.findIndex((b) => b.year === activeBenchmark.year),
    );
    return {
      W,
      H,
      padL,
      padT,
      plotW,
      plotH,
      xAt,
      energyPath: toPath(energyPts),
      compPath: toPath(compPts),
      energyPts,
      compPts,
      activeIdx,
    };
  }, [activeBenchmark.year]);

  const liveRows = useMemo(() => {
    if (!liveData) return { rows: [], maxVal: 1 };
    const rows = COUNTRY_PROFILES.map((c) => {
      const entry = liveData.countries[c.id];
      const datum = entry?.[liveMetric];
      return {
        country: c,
        entry,
        datum,
        value: datum?.value ?? -1,
      };
    }).sort((a, b) => b.value - a.value);
    const maxVal = Math.max(1, ...rows.map((r) => Math.max(0, r.value)));
    return { rows, maxVal };
  }, [liveData, liveMetric]);

  const techEvents = useMemo(() => {
    const q = milestoneQuery.trim().toLowerCase();
    return ALL_EVENTS.filter((ev) => {
      if (ev.primaryDimension !== 'tech') return false;
      if (milestoneEra !== 'all' && ev.eraId !== milestoneEra) return false;
      if (!q) return true;
      return `${ev.title} ${ev.locationName} ${ev.card.summary} ${ev.card.culture}`
        .toLowerCase()
        .includes(q);
    });
  }, [milestoneEra, milestoneQuery]);

  if (!open) return null;

  const isDark = theme === 'obsidian';
  const activeLiveMeta =
    LIVE_METRIC_OPTIONS.find((m) => m.key === liveMetric) || LIVE_METRIC_OPTIONS[0];

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
              style={{ backgroundColor: '#296B9E' }}
            >
              <Cpu className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                人类科学技术史图谱 · 能量算力跃迁、技术浪潮与全球实时研发指标
              </h2>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                纵览五千年从杠杆灌溉到算力芯片与基因编辑的科学突破，并联动 World Bank 最新 30 国研发实测数据
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭科技史图谱"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}
        >
          {(
            [
              { id: 'metrics', label: '寿命、能源与算力跃迁', icon: <Activity className="h-3.5 w-3.5" /> },
              { id: 'waves', label: '六大通用技术浪潮', icon: <Layers className="h-3.5 w-3.5" /> },
              { id: 'live', label: '30 国实时研发数据 (World Bank)', icon: <RefreshCw className="h-3.5 w-3.5" /> },
              { id: 'milestones', label: `科技突破索引 (${ALL_EVENTS.filter((e) => e.primaryDimension === 'tech').length})`, icon: <Sparkles className="h-3.5 w-3.5" /> },
            ] as Array<{ id: TechTab; label: string; icon: ReactNode }>
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: active ? '#296B9E' : 'var(--bg-surface)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="atlas-scroll flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'metrics' && (
            <div className="space-y-4">
              {/* Year Pills */}
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
                {TECH_PROGRESS_BENCHMARKS.map((b) => {
                  const active = b.year === activeBenchmark.year;
                  return (
                    <button
                      key={b.year}
                      type="button"
                      onClick={() => setSelectedBenchYear(b.year)}
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer"
                      style={{
                        backgroundColor: active ? '#296B9E' : 'var(--bg-surface)',
                        borderColor: active ? '#296B9E' : 'var(--border-subtle)',
                        color: active ? '#FFFFFF' : 'var(--text-secondary)',
                      }}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {activeBenchmark.label} · 人类预期寿命
                  </div>
                  <div className="mt-1 text-lg font-bold" style={{ color: '#2F855A' }}>
                    {activeBenchmark.lifeExpectancyYears} 岁
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    全球识字率约 {activeBenchmark.globalLiteracyPct}%
                  </div>
                </div>

                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    人均日耗能
                  </div>
                  <div className="mt-1 text-lg font-bold" style={{ color: '#D97706' }}>
                    {activeBenchmark.energyPerCapitaKwhDay} kWh/天
                  </div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }} title={activeBenchmark.dominantEnergy}>
                    {activeBenchmark.dominantEnergy}
                  </div>
                </div>

                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    极值旅行速度 & 算力阶跃
                  </div>
                  <div className="mt-1 text-lg font-bold" style={{ color: '#296B9E' }}>
                    {activeBenchmark.maxTravelSpeedKmh.toLocaleString('en-US')} km/h
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    峰值算力指数：10^{activeBenchmark.computeFlopsLog10} FLOPS 级
                  </div>
                </div>

                <div
                  className="rounded-xl border p-3 flex flex-col justify-between gap-1"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      里程碑技术底座
                    </div>
                    <div className="mt-0.5 text-xs font-medium leading-snug line-clamp-2">
                      {activeBenchmark.keyBreakthrough}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToYear(activeBenchmark.year);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 self-start text-[11px] font-semibold hover:underline cursor-pointer"
                    style={{ color: '#296B9E' }}
                  >
                    <span>在世界地图看 {formatShortYear(activeBenchmark.year)}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* SVG Chart 1 */}
              <div
                className="rounded-xl border p-3.5 space-y-2"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold">
                      人类预期寿命（岁）与全球识字率（%）五千年突破曲线
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      在 1800 年之前寿命长期锁死于 26–31 岁区间；牛痘疫苗、净水消毒、合成氨化肥与抗生素一举拉出陡峭 J 型曲线
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-4 rounded-full" style={{ backgroundColor: '#2F855A' }} />
                      <span>预期寿命 ({activeBenchmark.lifeExpectancyYears} 岁)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-4 rounded-full" style={{ backgroundColor: '#734B9B' }} />
                      <span>识字率 ({activeBenchmark.globalLiteracyPct}%)</span>
                    </span>
                  </div>
                </div>

                <svg viewBox={`0 0 ${healthLiteracyChart.W} ${healthLiteracyChart.H}`} className="w-full h-auto select-none">
                  {[25, 50, 75, 100].map((v) => {
                    const y = healthLiteracyChart.yAtPct(v);
                    return (
                      <g key={v}>
                        <line
                          x1={healthLiteracyChart.padL}
                          x2={healthLiteracyChart.W - 16}
                          y1={y}
                          y2={y}
                          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                          strokeDasharray="3 3"
                        />
                        <text
                          x={healthLiteracyChart.padL - 5}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill={isDark ? '#8FA2B8' : '#7A6F62'}
                        >
                          {v}
                        </text>
                      </g>
                    );
                  })}

                  <line
                    x1={healthLiteracyChart.xAt(healthLiteracyChart.activeIdx)}
                    x2={healthLiteracyChart.xAt(healthLiteracyChart.activeIdx)}
                    y1={healthLiteracyChart.padT}
                    y2={healthLiteracyChart.padT + healthLiteracyChart.plotH}
                    stroke="#296B9E"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                  />

                  <path d={healthLiteracyChart.lifePath} fill="none" stroke="#2F855A" strokeWidth="2.4" />
                  <path d={healthLiteracyChart.litPath} fill="none" stroke="#734B9B" strokeWidth="2.2" />

                  <circle
                    cx={healthLiteracyChart.lifePts[healthLiteracyChart.activeIdx][0]}
                    cy={healthLiteracyChart.lifePts[healthLiteracyChart.activeIdx][1]}
                    r={4.2}
                    fill="#2F855A"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx={healthLiteracyChart.litPts[healthLiteracyChart.activeIdx][0]}
                    cy={healthLiteracyChart.litPts[healthLiteracyChart.activeIdx][1]}
                    r={4.2}
                    fill="#734B9B"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />

                  {TECH_PROGRESS_BENCHMARKS.map((b, i) => (
                    <g key={b.year} className="cursor-pointer" onClick={() => setSelectedBenchYear(b.year)}>
                      <rect
                        x={healthLiteracyChart.xAt(i) - 18}
                        y={healthLiteracyChart.padT}
                        width={36}
                        height={healthLiteracyChart.plotH + 24}
                        fill="transparent"
                      />
                      <text
                        x={healthLiteracyChart.xAt(i)}
                        y={healthLiteracyChart.H - 7}
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight={b.year === activeBenchmark.year ? '700' : '500'}
                        fill={
                          b.year === activeBenchmark.year
                            ? '#296B9E'
                            : isDark
                              ? '#9DB0C4'
                              : '#6E6458'
                        }
                      >
                        {b.year === -2500 ? '-2500' : b.year}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* SVG Chart 2 */}
              <div
                className="rounded-xl border p-3.5 space-y-2"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold">
                      人均日耗能（kWh）与峰值计算能力（Log10 FLOPS）对照曲线
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      19 世纪以前由煤炭蒸汽驱动物理能耗大增，20 世纪下半叶硅基算力则以指数幂级速度暴涨逾 13 个数量级
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-4 rounded-full" style={{ backgroundColor: '#D97706' }} />
                      <span>人均能耗 ({activeBenchmark.energyPerCapitaKwhDay} kWh/d)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-4 rounded-full" style={{ backgroundColor: '#296B9E' }} />
                      <span>算力指数 (10^{activeBenchmark.computeFlopsLog10})</span>
                    </span>
                  </div>
                </div>

                <svg viewBox={`0 0 ${energyComputeChart.W} ${energyComputeChart.H}`} className="w-full h-auto select-none">
                  {[0.25, 0.5, 0.75, 1].map((r) => {
                    const y = energyComputeChart.padT + energyComputeChart.plotH * (1 - r);
                    return (
                      <line
                        key={r}
                        x1={energyComputeChart.padL}
                        x2={energyComputeChart.W - 16}
                        y1={y}
                        y2={y}
                        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                        strokeDasharray="3 3"
                      />
                    );
                  })}

                  <line
                    x1={energyComputeChart.xAt(energyComputeChart.activeIdx)}
                    x2={energyComputeChart.xAt(energyComputeChart.activeIdx)}
                    y1={energyComputeChart.padT}
                    y2={energyComputeChart.padT + energyComputeChart.plotH}
                    stroke="#296B9E"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                  />

                  <path d={energyComputeChart.energyPath} fill="none" stroke="#D97706" strokeWidth="2.3" />
                  <path d={energyComputeChart.compPath} fill="none" stroke="#296B9E" strokeWidth="2.4" />

                  <circle
                    cx={energyComputeChart.energyPts[energyComputeChart.activeIdx][0]}
                    cy={energyComputeChart.energyPts[energyComputeChart.activeIdx][1]}
                    r={4.2}
                    fill="#D97706"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx={energyComputeChart.compPts[energyComputeChart.activeIdx][0]}
                    cy={energyComputeChart.compPts[energyComputeChart.activeIdx][1]}
                    r={4.2}
                    fill="#296B9E"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />

                  {TECH_PROGRESS_BENCHMARKS.map((b, i) => (
                    <g key={b.year} className="cursor-pointer" onClick={() => setSelectedBenchYear(b.year)}>
                      <rect
                        x={energyComputeChart.xAt(i) - 18}
                        y={energyComputeChart.padT}
                        width={36}
                        height={energyComputeChart.plotH + 24}
                        fill="transparent"
                      />
                      <text
                        x={energyComputeChart.xAt(i)}
                        y={energyComputeChart.H - 7}
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight={b.year === activeBenchmark.year ? '700' : '500'}
                        fill={
                          b.year === activeBenchmark.year
                            ? '#296B9E'
                            : isDark
                              ? '#9DB0C4'
                              : '#6E6458'
                        }
                      >
                        {b.year === -2500 ? '-2500' : b.year}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {tab === 'waves' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TECH_REVOLUTION_WAVES.map((w, idx) => {
                const midYear = Math.round((w.startYear + w.endYear) / 2);
                const linkedEvents = w.relatedEventIds.map((id) => EVENT_MAP[id]).filter(Boolean);
                return (
                  <div
                    key={w.id}
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
                            style={{ backgroundColor: w.accentColor }}
                          >
                            浪潮 {idx + 1} · {w.periodLabel}
                          </span>
                          <h3 className="mt-1 text-sm font-bold">{w.name}</h3>
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
                            color: w.accentColor,
                          }}
                        >
                          <span>看 {formatShortYear(midYear)}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>核心能源：</strong>
                          {w.coreEnergy}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>信息载体：</strong>
                          {w.infoMedium}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>代表发明：</strong>
                          {w.flagshipInventions}
                        </div>
                        <div>
                          <strong style={{ color: w.accentColor }}>历史意义：</strong>
                          {w.structuralShift}
                        </div>
                      </div>
                    </div>

                    {linkedEvents.length > 0 && (
                      <div className="pt-2 border-t flex flex-wrap gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                        {linkedEvents.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => {
                              onSelectEvent(ev);
                              onClose();
                            }}
                            className="rounded-md border px-2 py-0.5 text-[10px] font-medium hover:opacity-85 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {ev.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'live' && (
            <div className="space-y-3">
              {/* Live Data Header Banner */}
              <div
                className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                style={{
                  backgroundColor: isDark ? 'rgba(41, 107, 158, 0.14)' : 'rgba(41, 107, 158, 0.08)',
                  borderColor: 'rgba(41, 107, 158, 0.35)',
                }}
              >
                <div>
                  <div className="font-bold" style={{ color: '#296B9E' }}>
                    {activeLiveMeta.label} — World Bank 实时自动同步快照
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {activeLiveMeta.desc}
                  </div>
                </div>
                {liveData && (
                  <div className="text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>
                    <div>数据源更新：{liveData.worldBankLastUpdated || '最近'}</div>
                    <div>本地脚本拉取：{new Date(liveData.fetchedAt).toLocaleString('zh-CN')}</div>
                  </div>
                )}
              </div>

              {/* Metric Switcher */}
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
                {LIVE_METRIC_OPTIONS.map((m) => {
                  const active = m.key === liveMetric;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setLiveMetric(m.key)}
                      className="shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: active ? m.color : 'var(--bg-surface)',
                        borderColor: active ? m.color : 'var(--border-subtle)',
                        color: active ? '#FFFFFF' : 'var(--text-secondary)',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {liveLoading && (
                <div className="py-10 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在加载最新 World Bank 国家科技指标...</span>
                </div>
              )}

              {liveError && (
                <div className="rounded-xl border p-4 text-xs" style={{ color: '#B83B3B', borderColor: '#B83B3B44' }}>
                  未能读取 live-indicators.json：{liveError}
                </div>
              )}

              {liveData && (
                <div
                  className="rounded-xl border divide-y"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {liveRows.rows.map(({ country, entry, datum, value }, idx) => {
                    const hasVal = value >= 0 && Boolean(datum);
                    const pct = hasVal ? Math.max(2, (value / liveRows.maxVal) * 100) : 0;
                    const formatted = !hasVal
                      ? '暂无数据'
                      : liveMetric === 'gdpPerCapitaPPP'
                        ? `$${value.toLocaleString('en-US')}`
                        : `${value}${activeLiveMeta.unit}`;
                    const hasProfile = Boolean(COUNTRY_PROFILE_MAP[country.id]);

                    return (
                      <div
                        key={country.id}
                        onClick={() => hasProfile && onSelectCountry(country.id)}
                        className="flex items-center gap-3 px-3.5 py-2 text-xs hover:opacity-85 transition cursor-pointer"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        title={`点击查看「${country.name}」国家演变与经济档案`}
                      >
                        <span
                          className="w-5 text-right font-bold shrink-0"
                          style={{ color: idx < 3 && hasVal ? activeLiveMeta.color : 'var(--text-muted)' }}
                        >
                          {hasVal ? idx + 1 : '—'}
                        </span>

                        <div className="w-28 sm:w-40 flex items-center gap-1.5 shrink-0 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: country.accentColor }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold truncate">{country.name}</div>
                            {entry?.isoNote && (
                              <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {entry.isoNote}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div
                            className="h-2.5 w-full rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-muted)' }}
                          >
                            {hasVal && (
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: activeLiveMeta.color,
                                }}
                              />
                            )}
                          </div>
                        </div>

                        <div className="w-28 text-right shrink-0">
                          <span className="font-semibold">{formatted}</span>
                          {datum && (
                            <span className="ml-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              ({datum.year})
                            </span>
                          )}
                        </div>

                        <Globe2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'milestones' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    value={milestoneQuery}
                    onChange={(e) => setMilestoneQuery(e.target.value)}
                    placeholder="过滤科技发明与科学家突破（如：蒸汽、芯片、疫苗、DNA、AI...）"
                    className="w-full rounded-xl border py-1.5 pl-8 pr-3 text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <select
                  value={milestoneEra}
                  onChange={(e) => setMilestoneEra(e.target.value)}
                  className="rounded-xl border px-2.5 py-1.5 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">全部时代 ({ALL_EVENTS.filter((e) => e.primaryDimension === 'tech').length})</option>
                  {ERAS.map((era) => (
                    <option key={era.id} value={era.id}>
                      {era.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {techEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      onSelectEvent(ev);
                      onClose();
                    }}
                    className="rounded-xl border p-3 text-left hover:opacity-90 transition cursor-pointer flex flex-col justify-between gap-1.5"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold" style={{ color: '#296B9E' }}>
                          {ev.dateDisplay} · {ev.locationName}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {REGION_META[ev.region].label}
                        </span>
                      </div>
                      <h4 className="mt-1 text-xs sm:text-sm font-bold">{ev.title}</h4>
                      <p className="mt-1 text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {ev.card.summary}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footnote */}
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
              数据口径说明：历史寿命/识字/能耗为综合科学史与人口学估算；「30 国实时研发数据」由 GitHub Actions 每月自动抓取 World Bank Open Data 官方接口刷新。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
