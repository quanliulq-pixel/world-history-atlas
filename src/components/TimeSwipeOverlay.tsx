import { ArrowLeftRight, Columns2, X } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectionMode, SnapshotMeta, ThemeMode } from '../types/history';
import { loadSnapshot, type DecodedSnapshot, type PhysicalAtlasData } from '../utils/snapshotLoader';
import { formatShortYear, formatYear } from '../utils/timeline';

interface TimeSwipeOverlayProps {
  open: boolean;
  mainMap: maplibregl.Map | null;
  physical: PhysicalAtlasData | null;
  snapshots: SnapshotMeta[];
  currentYear: number;
  activeSnapshotYear: number | null;
  theme: ThemeMode;
  projection: ProjectionMode;
  onSelectRightYear: (year: number) => void;
  onClose: () => void;
}

const SWIPE_PRESETS: Array<{ label: string; leftYear: number; rightYear: number }> = [
  { label: '汉罗马 vs 一战前夜', leftYear: 100, rightYear: 1914 },
  { label: '盛唐 vs 蒙古帝国', leftYear: 700, rightYear: 1279 },
  { label: '大航海 vs 殖民帝国', leftYear: 1600, rightYear: 1880 },
  { label: '冷战两极 vs 当代', leftYear: 1960, rightYear: 2025 },
];

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export function TimeSwipeOverlay({
  open,
  mainMap,
  physical,
  snapshots,
  currentYear,
  activeSnapshotYear,
  theme,
  projection,
  onSelectRightYear,
  onClose,
}: TimeSwipeOverlayProps) {
  const compareContainerRef = useRef<HTMLDivElement | null>(null);
  const compareMapRef = useRef<maplibregl.Map | null>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const [compareReady, setCompareReady] = useState(false);

  const [leftYear, setLeftYear] = useState<number>(() => (currentYear >= 1500 ? 100 : 1914));
  const [leftSnapshot, setLeftSnapshot] = useState<DecodedSnapshot | null>(null);
  const [splitPct, setSplitPct] = useState<number>(50);
  const [draggingDivider, setDraggingDivider] = useState(false);

  const availableYears = useMemo(() => snapshots.map((s) => s.year), [snapshots]);

  // Keep leftYear snapped to an existing snapshot
  const resolvedLeftMeta = useMemo(() => {
    if (snapshots.length === 0) return null;
    let best = snapshots[0];
    let dist = Math.abs(best.year - leftYear);
    for (const s of snapshots) {
      const d = Math.abs(s.year - leftYear);
      if (d < dist) {
        best = s;
        dist = d;
      }
    }
    return best;
  }, [snapshots, leftYear]);

  useEffect(() => {
    if (!open || !resolvedLeftMeta) return;
    let cancelled = false;
    void loadSnapshot(resolvedLeftMeta).then((decoded) => {
      if (!cancelled) setLeftSnapshot(decoded);
    });
    return () => {
      cancelled = true;
    };
  }, [open, resolvedLeftMeta]);

  // Initialize synchronized secondary MapLibre instance while modal is open
  useEffect(() => {
    if (!open || !compareContainerRef.current) return;
    const isDark = theme === 'obsidian';

    const style: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'cmp-land': { type: 'geojson', data: physical?.land || EMPTY_FC },
        'cmp-lakes': { type: 'geojson', data: physical?.lakes || EMPTY_FC },
        'cmp-rivers': { type: 'geojson', data: physical?.rivers || EMPTY_FC },
        'cmp-empires': { type: 'geojson', data: leftSnapshot?.polygons || EMPTY_FC },
        'cmp-labels': { type: 'geojson', data: leftSnapshot?.labels || EMPTY_FC },
      },
      layers: [
        {
          id: 'cmp-bg',
          type: 'background',
          paint: { 'background-color': isDark ? '#0D1724' : '#C6DCE4' },
        },
        {
          id: 'cmp-land-fill',
          type: 'fill',
          source: 'cmp-land',
          paint: { 'fill-color': isDark ? '#1A2635' : '#E8DFCB' },
        },
        {
          id: 'cmp-land-line',
          type: 'line',
          source: 'cmp-land',
          paint: {
            'line-color': isDark ? 'rgba(148,175,204,0.22)' : 'rgba(120,100,72,0.34)',
            'line-width': 0.8,
          },
        },
        {
          id: 'cmp-empires-fill',
          type: 'fill',
          source: 'cmp-empires',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': isDark ? 0.56 : 0.54,
          },
        },
        {
          id: 'cmp-lakes-fill',
          type: 'fill',
          source: 'cmp-lakes',
          paint: {
            'fill-color': isDark ? '#102438' : '#92BDD0',
            'fill-opacity': 0.85,
          },
        },
        {
          id: 'cmp-rivers-line',
          type: 'line',
          source: 'cmp-rivers',
          paint: {
            'line-color': isDark ? '#274F73' : '#6C9FB7',
            'line-width': 1,
            'line-opacity': 0.68,
          },
        },
        {
          id: 'cmp-empires-border',
          type: 'line',
          source: 'cmp-empires',
          paint: {
            'line-color': isDark ? 'rgba(226,232,240,0.45)' : 'rgba(54,41,28,0.45)',
            'line-width': 1.1,
          },
        },
        {
          id: 'cmp-empires-labels',
          type: 'symbol',
          source: 'cmp-labels',
          layout: {
            'text-field': ['get', 'zhName'],
            'text-size': 11,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': isDark ? '#E8EEF5' : '#2B2116',
            'text-halo-color': isDark ? 'rgba(13,20,29,0.88)' : 'rgba(251,248,241,0.9)',
            'text-halo-width': 1.4,
          },
        },
      ],
    };

    const center = mainMap ? mainMap.getCenter() : { lng: 42, lat: 25 };
    const zoom = mainMap ? mainMap.getZoom() : 1.5;
    const bearing = mainMap ? mainMap.getBearing() : 0;
    const pitch = mainMap ? mainMap.getPitch() : 0;

    const cmp = new maplibregl.Map({
      container: compareContainerRef.current,
      style,
      center: [center.lng, center.lat],
      zoom,
      bearing,
      pitch,
      interactive: false,
      attributionControl: false,
    });
    compareMapRef.current = cmp;

    cmp.on('load', () => {
      if (projection === 'globe') {
        try {
          cmp.setProjection({ type: 'globe' });
        } catch {
          // Fallback to mercator cleanly
        }
      }
      setCompareReady(true);
    });

    const syncCamera = () => {
      if (!mainMap || !compareMapRef.current) return;
      const c = mainMap.getCenter();
      compareMapRef.current.jumpTo({
        center: [c.lng, c.lat],
        zoom: mainMap.getZoom(),
        bearing: mainMap.getBearing(),
        pitch: mainMap.getPitch(),
      });
    };

    mainMap?.on('move', syncCamera);

    return () => {
      mainMap?.off('move', syncCamera);
      setCompareReady(false);
      compareMapRef.current = null;
      cmp.remove();
    };
  }, [open, mainMap, theme, projection]);

  // Keep GeoJSON sources updated as physical or leftSnapshot loads
  useEffect(() => {
    const cmp = compareMapRef.current;
    if (!cmp || !compareReady) return;
    const landSrc = cmp.getSource('cmp-land') as maplibregl.GeoJSONSource | undefined;
    const lakeSrc = cmp.getSource('cmp-lakes') as maplibregl.GeoJSONSource | undefined;
    const riverSrc = cmp.getSource('cmp-rivers') as maplibregl.GeoJSONSource | undefined;
    const empSrc = cmp.getSource('cmp-empires') as maplibregl.GeoJSONSource | undefined;
    const lblSrc = cmp.getSource('cmp-labels') as maplibregl.GeoJSONSource | undefined;
    if (physical?.land && landSrc) landSrc.setData(physical.land);
    if (physical?.lakes && lakeSrc) lakeSrc.setData(physical.lakes);
    if (physical?.rivers && riverSrc) riverSrc.setData(physical.rivers);
    if (leftSnapshot?.polygons && empSrc) empSrc.setData(leftSnapshot.polygons);
    if (leftSnapshot?.labels && lblSrc) lblSrc.setData(leftSnapshot.labels);
  }, [compareReady, physical, leftSnapshot]);

  if (!open) return null;

  const isDark = theme === 'obsidian';
  const rightDisplayYear = activeSnapshotYear ?? currentYear;

  const updateSplitFromClientX = (clientX: number) => {
    const root = overlayRootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setSplitPct(Math.max(8, Math.min(92, pct)));
  };

  return (
    <div ref={overlayRootRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Clipped left comparison map (non-interactive so underlying mainMap stays draggable/zoomable) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
      >
        <div ref={compareContainerRef} className="h-full w-full" />
      </div>

      {/* Draggable vertical curtain divider */}
      <div
        className="pointer-events-none absolute inset-y-0 z-20"
        style={{ left: `${splitPct}%` }}
      >
        <div
          className="h-full w-0.5 -translate-x-1/2 shadow-md"
          style={{ backgroundColor: isDark ? '#E5A94C' : '#8C2D2D' }}
        />
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDraggingDivider(true);
            updateSplitFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (draggingDivider) updateSplitFromClientX(e.clientX);
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            setDraggingDivider(false);
          }}
          onPointerCancel={() => setDraggingDivider(false)}
          className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-11 w-7 items-center justify-center rounded-full border shadow-xl cursor-ew-resize touch-none"
          style={{
            backgroundColor: isDark ? '#141E2B' : '#FBF8F1',
            borderColor: isDark ? '#E5A94C' : '#8C2D2D',
            color: isDark ? '#E5A94C' : '#8C2D2D',
          }}
          title="左右拖动对比两个时代的疆域版图"
          aria-label="拖动双时空对比滑块"
        >
          <Columns2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Top Comparison Control Bar */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-center">
        <div
          className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur-md max-w-full"
          style={{
            backgroundColor: isDark ? 'rgba(18, 28, 40, 0.94)' : 'rgba(251, 248, 241, 0.95)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Columns2 className="h-3 w-3" />
            <span>双时空卷帘对比</span>
          </span>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10.5px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              左幕
            </span>
            <select
              value={resolvedLeftMeta?.year ?? leftYear}
              onChange={(e) => setLeftYear(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 text-[11px] font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
              aria-label="左侧对比年份"
            >
              {availableYears.map((yr) => (
                <option key={`l-${yr}`} value={yr}>
                  {formatYear(yr)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                const prevLeft = resolvedLeftMeta?.year ?? leftYear;
                setLeftYear(rightDisplayYear);
                onSelectRightYear(prevLeft);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              title="对调左右年份"
              aria-label="对调左右对比年份"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>

            <span className="text-[10.5px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              右幕
            </span>
            <select
              value={rightDisplayYear}
              onChange={(e) => onSelectRightYear(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 text-[11px] font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
              aria-label="右侧主图年份"
            >
              {availableYears.map((yr) => (
                <option key={`r-${yr}`} value={yr}>
                  {formatYear(yr)}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {SWIPE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setLeftYear(preset.leftYear);
                  onSelectRightYear(preset.rightYear);
                }}
                className="rounded-lg border px-2 py-0.5 text-[10px] font-medium hover:opacity-85 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)' }}
          >
            <X className="h-3.5 w-3.5" />
            <span>退出对比</span>
          </button>
        </div>
      </div>

      {/* Corner year tags on left/right */}
      <div
        className="pointer-events-none absolute left-4 bottom-4 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-sm"
        style={{
          backgroundColor: isDark ? 'rgba(18, 28, 40, 0.86)' : 'rgba(251, 248, 241, 0.90)',
          borderColor: 'var(--border-strong)',
          color: isDark ? '#E5A94C' : '#8C2D2D',
        }}
      >
        左幕 · {formatShortYear(resolvedLeftMeta?.year ?? leftYear)}
      </div>

      <div
        className="pointer-events-none absolute right-4 bottom-4 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-sm"
        style={{
          backgroundColor: isDark ? 'rgba(18, 28, 40, 0.86)' : 'rgba(251, 248, 241, 0.90)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        右幕 · {formatShortYear(rightDisplayYear)}
      </div>
    </div>
  );
}
