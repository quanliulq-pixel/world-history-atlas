import {
  BookOpen,
  Columns2,
  Compass,
  Cpu,
  Globe,
  Landmark,
  Layers,
  Map as MapIcon,
  Moon,
  Mountain,
  Network,
  Route as RouteIcon,
  Search,
  Sparkles,
  Sun,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { DIMENSION_META } from '../data/eras';
import type { Dimension, Era, ProjectionMode, SubPeriod, ThemeMode } from '../types/history';
import { formatShortYear, formatYear } from '../utils/timeline';

interface TopBarProps {
  currentYear: number;
  currentEra: Era;
  currentSubPeriod: SubPeriod;
  snapshotYear: number | null;
  selectedDimensions: Set<Dimension>;
  showAllEras: boolean;
  showRoutes: boolean;
  showFigures: boolean;
  showRelief: boolean;
  showLandmarks: boolean;
  projection: ProjectionMode;
  theme: ThemeMode;
  onToggleDimension: (dim: Dimension | 'all') => void;
  onToggleShowAllEras: () => void;
  onToggleRoutes: () => void;
  onToggleFigures: () => void;
  onToggleRelief: () => void;
  onToggleLandmarks: () => void;
  onToggleProjection: () => void;
  onToggleTheme: () => void;
  onOpenPulse: () => void;
  onOpenEconomicAtlas: () => void;
  onOpenTechAtlas: () => void;
  onOpenStorylines: () => void;
  onOpenCausalGraph: () => void;
  timeSwipeOpen: boolean;
  onToggleTimeSwipe: () => void;
  onOpenSearch: () => void;
  onOpenAiStudio: () => void;
  aiUnlocked: boolean;
}

const DIMENSIONS: Dimension[] = ['politics', 'economy', 'culture', 'tech'];

export function TopBar({
  currentYear,
  currentEra,
  currentSubPeriod,
  snapshotYear,
  selectedDimensions,
  showAllEras,
  showRoutes,
  showFigures,
  showRelief,
  showLandmarks,
  projection,
  theme,
  onToggleDimension,
  onToggleShowAllEras,
  onToggleRoutes,
  onToggleFigures,
  onToggleRelief,
  onToggleLandmarks,
  onToggleProjection,
  onToggleTheme,
  onOpenPulse,
  onOpenEconomicAtlas,
  onOpenTechAtlas,
  onOpenStorylines,
  onOpenCausalGraph,
  timeSwipeOpen,
  onToggleTimeSwipe,
  onOpenSearch,
  onOpenAiStudio,
  aiUnlocked,
}: TopBarProps) {
  const allDimsActive = selectedDimensions.size === DIMENSIONS.length;

  return (
    <header
      className="pointer-events-auto relative z-30 flex flex-col gap-1.5 px-3 py-2 md:px-4 md:py-2.5 border-b backdrop-blur-md"
      style={{
        backgroundColor:
          theme === 'obsidian' ? 'rgba(20, 30, 43, 0.88)' : 'rgba(251, 248, 241, 0.90)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Row 1: Brand + Year/Era Display + Action Tools */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-sm shadow-sm"
            style={{ backgroundColor: currentEra.accentColor, color: '#FFFFFF' }}
          >
            史
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm md:text-base font-bold tracking-tight">
                <span className="sm:hidden">世界史图谱</span>
                <span className="hidden sm:inline">世界通史时空图谱</span>
              </h1>
              <span
                className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--bg-muted)',
                  color: 'var(--text-secondary)',
                }}
                title={currentSubPeriod.themeSummary}
              >
                {currentEra.shortName} · {currentSubPeriod.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] md:text-xs min-w-0 whitespace-nowrap overflow-hidden">
              <span className="font-semibold shrink-0" style={{ color: 'var(--accent-primary)' }}>
                {formatYear(currentYear)}
              </span>
              {snapshotYear !== null && (
                <span className="hidden sm:inline truncate" style={{ color: 'var(--text-muted)' }}>
                  · 疆域截面 {formatShortYear(snapshotYear)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAiStudio}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: aiUnlocked ? 'rgba(180, 116, 23, 0.14)' : 'var(--bg-surface)',
              borderColor: aiUnlocked ? '#B47417' : 'var(--border-strong)',
              color: theme === 'obsidian' ? '#E5A94C' : '#9B5E0B',
            }}
            title="打开 Gemini AI 史学导师与跨代对比"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">AI 导师</span>
          </button>

          <button
            type="button"
            onClick={onOpenStorylines}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#FFFFFF',
            }}
            title="专题导览故事线"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>专题导览</span>
          </button>

          <button
            type="button"
            onClick={onOpenPulse}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
            title="同一时期全球六大区域对比"
          >
            <Compass className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">同代横切</span>
          </button>

          <button
            type="button"
            onClick={onOpenEconomicAtlas}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'rgba(197, 131, 31, 0.14)',
              borderColor: 'rgba(197, 131, 31, 0.45)',
              color: theme === 'obsidian' ? '#E5A94C' : '#9B5E0B',
            }}
            title="世界经济史量化图谱：全球 GDP 变迁、货币体系、金融危机与 30 国排行"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">经济数据</span>
          </button>

          <button
            type="button"
            onClick={onOpenTechAtlas}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'rgba(41, 107, 158, 0.14)',
              borderColor: 'rgba(41, 107, 158, 0.45)',
              color: theme === 'obsidian' ? '#58A3D9' : '#296B9E',
            }}
            title="人类科学技术史图谱：寿命算力跃迁、六大技术浪潮与 World Bank 30 国实时研发数据"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">科技数据</span>
          </button>

          <button
            type="button"
            onClick={onOpenCausalGraph}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title="全局历史因果脉络星图"
          >
            <Network className="h-3.5 w-3.5" style={{ color: '#296B9E' }} />
            <span className="hidden xl:inline">因果星图</span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title="检索历史事件与人物"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">检索</span>
          </button>

          <button
            type="button"
            onClick={onToggleProjection}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title={projection === 'globe' ? '切换为平面地图' : '切换为 3D 地球仪'}
          >
            {projection === 'globe' ? (
              <MapIcon className="h-3.5 w-3.5" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">{projection === 'globe' ? '平面' : '地球'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center rounded-lg p-1.5 border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            aria-label="切换羊皮纸或暗夜主题"
            title={theme === 'obsidian' ? '切换羊皮纸主题' : '切换暗夜主题'}
          >
            {theme === 'obsidian' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Row 2: Dimension Filters & Map Layer Toggles (horizontally scrollable on mobile) */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => onToggleDimension('all')}
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: allDimsActive ? 'var(--text-primary)' : 'var(--bg-surface)',
            color: allDimsActive ? 'var(--bg-surface)' : 'var(--text-secondary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          全部维度
        </button>

        {DIMENSIONS.map((dim) => {
          const meta = DIMENSION_META[dim];
          const active = selectedDimensions.has(dim);
          const color = theme === 'obsidian' ? meta.darkColor : meta.color;
          return (
            <button
              key={dim}
              type="button"
              onClick={() => onToggleDimension(dim)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
              style={{
                backgroundColor: active ? meta.bgTint : 'var(--bg-surface)',
                borderColor: active ? color : 'var(--border-subtle)',
                color: active ? color : 'var(--text-muted)',
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? color : 'var(--text-muted)' }}
              />
              <span>{meta.label}</span>
            </button>
          );
        })}

        <div className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />

        <button
          type="button"
          onClick={onToggleRoutes}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: showRoutes ? 'rgba(197, 131, 31, 0.14)' : 'var(--bg-surface)',
            borderColor: showRoutes ? 'var(--accent-gold)' : 'var(--border-subtle)',
            color: showRoutes ? 'var(--accent-gold)' : 'var(--text-muted)',
          }}
        >
          <RouteIcon className="h-3 w-3" />
          <span>商路与航线</span>
        </button>

        <button
          type="button"
          onClick={onToggleFigures}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: showFigures ? 'rgba(158, 52, 52, 0.12)' : 'var(--bg-surface)',
            borderColor: showFigures
              ? theme === 'obsidian'
                ? '#E06B63'
                : '#9E3434'
              : 'var(--border-subtle)',
            color: showFigures
              ? theme === 'obsidian'
                ? '#E06B63'
                : '#9E3434'
              : 'var(--text-muted)',
          }}
          title="显示或隐藏地图上的著名历史人物印章"
        >
          <UserRound className="h-3 w-3" />
          <span>历史人物</span>
        </button>

        <button
          type="button"
          onClick={onToggleRelief}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: showRelief ? 'rgba(139, 90, 60, 0.14)' : 'var(--bg-surface)',
            borderColor: showRelief ? '#8B5A3C' : 'var(--border-subtle)',
            color: showRelief ? (theme === 'obsidian' ? '#D6A47E' : '#8B5A3C') : 'var(--text-muted)',
          }}
          title="开启或关闭三维山体地形晕渲与水系阴影"
        >
          <Mountain className="h-3 w-3" />
          <span>地形浮雕</span>
        </button>

        <button
          type="button"
          onClick={onToggleLandmarks}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: showLandmarks ? 'rgba(166, 84, 101, 0.14)' : 'var(--bg-surface)',
            borderColor: showLandmarks ? '#A65465' : 'var(--border-subtle)',
            color: showLandmarks ? (theme === 'obsidian' ? '#E490A0' : '#A65465') : 'var(--text-muted)',
          }}
          title="显示或隐藏历代古都、关隘与长城运河地标"
        >
          <Landmark className="h-3 w-3" />
          <span>古都与地标</span>
        </button>

        <button
          type="button"
          onClick={onToggleShowAllEras}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: showAllEras ? 'rgba(41, 107, 158, 0.14)' : 'var(--bg-surface)',
            borderColor: showAllEras ? '#296B9E' : 'var(--border-subtle)',
            color: showAllEras ? '#296B9E' : 'var(--text-muted)',
          }}
          title="开启后同时显示全史所有事件标点（非当期大事半透明）"
        >
          <Layers className="h-3 w-3" />
          <span>{showAllEras ? '全史标点: 开' : '仅当期大事'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTimeSwipe}
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition cursor-pointer"
          style={{
            backgroundColor: timeSwipeOpen ? 'rgba(140, 45, 45, 0.14)' : 'var(--bg-surface)',
            borderColor: timeSwipeOpen ? 'var(--accent-primary)' : 'var(--border-subtle)',
            color: timeSwipeOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          title="开启左右卷帘对比任意两个历史年份的帝国疆域"
        >
          <Columns2 className="h-3 w-3" />
          <span>双时空对比</span>
        </button>
      </div>
    </header>
  );
}
