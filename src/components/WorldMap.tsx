import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DIMENSION_META, FIGURE_ROLE_META } from '../data/eras';
import { EVENT_MAP } from '../data/events';
import type {
  HistoricalFigure,
  HistoricalRoute,
  HistoryEvent,
  ProjectionMode,
  ThemeMode,
} from '../types/history';
import {
  buildCausalArc,
  buildGraticuleGeoJSON,
  buildSmoothRouteLine,
  computePolylineLengths,
  samplePolylineAt,
  slicePolylineByFraction,
} from '../utils/geo';
import type { DecodedSnapshot, PhysicalAtlasData } from '../utils/snapshotLoader';
import { formatShortYear } from '../utils/timeline';

export interface VisibleEventItem {
  event: HistoryEvent;
  active: boolean;
  opacity: number;
}

export interface VisibleFigureItem {
  figure: HistoricalFigure;
  active: boolean;
  isAlive: boolean;
  opacity: number;
}

interface WorldMapProps {
  theme: ThemeMode;
  projection: ProjectionMode;
  currentYear: number;
  isPlaying: boolean;
  physical: PhysicalAtlasData | null;
  snapshot: DecodedSnapshot | null;
  events: VisibleEventItem[];
  figures: VisibleFigureItem[];
  selectedEvent: HistoryEvent | null;
  selectedFigure: HistoricalFigure | null;
  recentTriggerEventId: string | null;
  masteredIds: Set<string>;
  bookmarkedIds: Set<string>;
  activeRoutes: HistoricalRoute[];
  focusRouteId: string | null;
  flyTarget: {
    center: [number, number];
    zoom: number;
    pitch?: number;
    duration?: number;
    nonce: number;
  } | null;
  onSelectEvent: (ev: HistoryEvent) => void;
  onSelectFigure: (fig: HistoricalFigure) => void;
  onDeselectEvent?: () => void;
}

interface ClickedPolity {
  zhName: string;
  enName: string;
  groupZhName: string;
  snapshotYear: number;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function buildEmpireFillOpacityExpr(
  baseOpacity: number,
  mixFactor = 1,
): maplibregl.ExpressionSpecification | number {
  if (mixFactor <= 0.001) return 0;
  const hoverOpacity = Math.min(0.88, baseOpacity + 0.16);
  const caseExpr: maplibregl.ExpressionSpecification = [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    ['case', ['boolean', ['get', 'isDiffuse'], false], 0.42, hoverOpacity],
    ['case', ['boolean', ['get', 'isDiffuse'], false], 0.24, baseOpacity],
  ];
  return mixFactor >= 0.999 ? caseExpr : ['*', caseExpr, mixFactor];
}

const THEME_COLORS = {
  parchment: {
    ocean: '#C6DCE4',
    graticule: 'rgba(65, 92, 110, 0.14)',
    land: '#EAE1CC',
    landBorder: 'rgba(128, 110, 82, 0.28)',
    mountain: 'rgba(148, 121, 86, 0.24)',
    desert: 'rgba(219, 184, 116, 0.28)',
    plateau: 'rgba(176, 146, 103, 0.20)',
    water: '#98C1D2',
    river: '#7CAEC4',
    empireFillOpacity: 0.62,
    empireBorder: 'rgba(62, 48, 34, 0.34)',
    empireHover: 'rgba(255, 250, 235, 0.28)',
    labelColor: '#2B2116',
    labelHalo: 'rgba(248, 242, 228, 0.88)',
  },
  obsidian: {
    ocean: '#0C1824',
    graticule: 'rgba(140, 175, 210, 0.11)',
    land: '#1D2733',
    landBorder: 'rgba(148, 173, 198, 0.22)',
    mountain: 'rgba(92, 112, 134, 0.28)',
    desert: 'rgba(138, 114, 72, 0.20)',
    plateau: 'rgba(88, 108, 128, 0.22)',
    water: '#132E45',
    river: '#285272',
    empireFillOpacity: 0.54,
    empireBorder: 'rgba(218, 230, 244, 0.26)',
    empireHover: 'rgba(255, 255, 255, 0.18)',
    labelColor: '#EEF3F9',
    labelHalo: 'rgba(14, 24, 36, 0.88)',
  },
};

export function WorldMap({
  theme,
  projection,
  currentYear,
  isPlaying,
  physical,
  snapshot,
  events,
  figures,
  selectedEvent,
  selectedFigure,
  recentTriggerEventId,
  masteredIds,
  bookmarkedIds,
  activeRoutes,
  focusRouteId,
  flyTarget,
  onSelectEvent,
  onSelectFigure,
  onDeselectEvent,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement; coords: [number, number] }>
  >(new Map());
  const figureMarkersRef = useRef<
    Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement; coords: [number, number] }>
  >(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [hoveredPolity, setHoveredPolity] = useState<{
    zhName: string;
    enName: string;
    x: number;
    y: number;
  } | null>(null);
  const [clickedPolity, setClickedPolity] = useState<ClickedPolity | null>(null);

  const themeRef = useRef(theme);
  themeRef.current = theme;
  const projectionRef = useRef(projection);
  projectionRef.current = projection;
  const activeBufferRef = useRef<'a' | 'b'>('a');
  const lastSnapshotYearRef = useRef<number | null>(null);
  const crossfadeRafRef = useRef<number>(0);
  const onSelectRef = useRef(onSelectEvent);
  onSelectRef.current = onSelectEvent;
  const onSelectFigureRef = useRef(onSelectFigure);
  onSelectFigureRef.current = onSelectFigure;
  const onDeselectRef = useRef(onDeselectEvent);
  onDeselectRef.current = onDeselectEvent;
  const snapshotYearRef = useRef<number>(snapshot?.year ?? -3000);
  snapshotYearRef.current = snapshot?.year ?? -3000;

  const syncGlobeMarkerVisibility = useCallback((map: maplibregl.Map) => {
    const isGlobe = projectionRef.current === 'globe';
    const center = isGlobe ? map.getCenter() : null;
    const rad = Math.PI / 180;
    const lat0 = center ? center.lat * rad : 0;
    const lng0 = center ? center.lng * rad : 0;
    const sinLat0 = Math.sin(lat0);
    const cosLat0 = Math.cos(lat0);

    for (const markerMap of [markersRef.current, figureMarkersRef.current]) {
      for (const entry of markerMap.values()) {
        if (!isGlobe) {
          entry.el.style.visibility = 'visible';
          entry.el.style.pointerEvents = 'auto';
          continue;
        }
        const lat1 = entry.coords[1] * rad;
        const lng1 = entry.coords[0] * rad;
        const cosAngle =
          sinLat0 * Math.sin(lat1) + cosLat0 * Math.cos(lat1) * Math.cos(lng1 - lng0);
        // Hide markers on or behind the horizon edge of the 3D globe
        const visible = cosAngle >= 0.14;
        entry.el.style.visibility = visible ? 'visible' : 'hidden';
        entry.el.style.pointerEvents = visible ? 'auto' : 'none';
      }
    }
  }, []);

  const graticuleData = useMemo(() => buildGraticuleGeoJSON(), []);

  const routesRenderMeta = useMemo<{
    geojson: GeoJSON.FeatureCollection;
    particlesMeta: {
      coords: [number, number][];
      cum: number[];
      color: string;
      focused: boolean;
      bidirectional: boolean;
    }[];
  }>(() => {
    const features: GeoJSON.Feature[] = [];
    const particlesMeta: {
      coords: [number, number][];
      cum: number[];
      color: string;
      focused: boolean;
      bidirectional: boolean;
    }[] = [];

    for (const route of activeRoutes) {
      const smoothCoords = buildSmoothRouteLine(route.waypoints);
      const fullCum = computePolylineLengths(smoothCoords);
      const introSpan = Math.max(12, Math.min(40, (route.endYear - route.startYear) * 0.2));
      const fraction = Math.max(0.12, Math.min(1, (currentYear - route.startYear + 3) / introSpan));
      const drawnCoords =
        fraction >= 0.999 ? smoothCoords : slicePolylineByFraction(smoothCoords, fullCum, fraction);
      const drawnCum = fraction >= 0.999 ? fullCum : computePolylineLengths(drawnCoords);
      const focused = focusRouteId === route.id;

      features.push({
        type: 'Feature',
        properties: {
          id: route.id,
          name: route.name,
          color: route.color,
          focused: focused ? 1 : 0,
        },
        geometry: {
          type: 'LineString',
          coordinates: drawnCoords,
        },
      });

      particlesMeta.push({
        coords: drawnCoords,
        cum: drawnCum,
        color: route.color,
        focused,
        bidirectional: !!route.bidirectional,
      });
    }

    return {
      geojson: { type: 'FeatureCollection', features },
      particlesMeta,
    };
  }, [activeRoutes, focusRouteId, currentYear]);

  const causalGeoJSON = useMemo<{
    arcs: GeoJSON.FeatureCollection;
    points: GeoJSON.FeatureCollection;
    arcsMeta: { coords: [number, number][]; cum: number[]; color: string }[];
  }>(() => {
    if (!selectedEvent && !selectedFigure) {
      return { arcs: EMPTY_FC, points: EMPTY_FC, arcsMeta: [] };
    }
    const arcFeatures: GeoJSON.Feature[] = [];
    const pointFeatures: GeoJSON.Feature[] = [];
    const arcsMeta: { coords: [number, number][]; cum: number[]; color: string }[] = [];

    if (selectedEvent) {
      for (const causeId of selectedEvent.causes || []) {
        const target = EVENT_MAP[causeId];
        if (!target) continue;
        const line = buildCausalArc(target.coords, selectedEvent.coords);
        arcFeatures.push({
          type: 'Feature',
          properties: { kind: 'cause', label: target.title },
          geometry: { type: 'LineString', coordinates: line },
        });
        pointFeatures.push({
          type: 'Feature',
          properties: { kind: 'cause', title: target.title },
          geometry: { type: 'Point', coordinates: line[0] },
        });
        arcsMeta.push({
          coords: line,
          cum: computePolylineLengths(line),
          color: '#F59E0B',
        });
      }

      for (const effectId of selectedEvent.effects || []) {
        const target = EVENT_MAP[effectId];
        if (!target) continue;
        const line = buildCausalArc(selectedEvent.coords, target.coords);
        arcFeatures.push({
          type: 'Feature',
          properties: { kind: 'effect', label: target.title },
          geometry: { type: 'LineString', coordinates: line },
        });
        pointFeatures.push({
          type: 'Feature',
          properties: { kind: 'effect', title: target.title },
          geometry: { type: 'Point', coordinates: line[line.length - 1] },
        });
        arcsMeta.push({
          coords: line,
          cum: computePolylineLengths(line),
          color: '#10B981',
        });
      }
    } else if (selectedFigure) {
      for (const evId of selectedFigure.relatedEventIds || []) {
        const target = EVENT_MAP[evId];
        if (!target) continue;
        if (
          Math.abs(target.coords[0] - selectedFigure.coords[0]) <= 1 &&
          Math.abs(target.coords[1] - selectedFigure.coords[1]) <= 1
        ) {
          continue;
        }
        const line = buildCausalArc(selectedFigure.coords, target.coords);
        arcFeatures.push({
          type: 'Feature',
          properties: { kind: 'effect', label: target.title },
          geometry: { type: 'LineString', coordinates: line },
        });
        pointFeatures.push({
          type: 'Feature',
          properties: { kind: 'effect', title: target.title },
          geometry: { type: 'Point', coordinates: line[line.length - 1] },
        });
        arcsMeta.push({
          coords: line,
          cum: computePolylineLengths(line),
          color: '#10B981',
        });
      }
    }

    return {
      arcs: { type: 'FeatureCollection', features: arcFeatures },
      points: { type: 'FeatureCollection', features: pointFeatures },
      arcsMeta,
    };
  }, [selectedEvent, selectedFigure]);

  // Initialize MapLibre once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = THEME_COLORS[theme];
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL;

    maplibregl.setWorkerUrl(`${origin}${base}maplibre-gl-worker.js`);

    const initialStyle: maplibregl.StyleSpecification = {
      version: 8,
      glyphs: `${origin}${base}fonts/{fontstack}/{range}.pbf`,
      projection: { type: projection },
      sources: {
        graticule: { type: 'geojson', data: graticuleData },
        'physical-land': { type: 'geojson', data: EMPTY_FC },
        'physical-relief': { type: 'geojson', data: EMPTY_FC },
        'physical-lakes': { type: 'geojson', data: EMPTY_FC },
        'physical-rivers': { type: 'geojson', data: EMPTY_FC },
        'empires-a': { type: 'geojson', data: EMPTY_FC, generateId: true },
        'empires-b': { type: 'geojson', data: EMPTY_FC, generateId: true },
        'empire-labels': { type: 'geojson', data: EMPTY_FC },
        routes: { type: 'geojson', data: EMPTY_FC },
        'route-particles': { type: 'geojson', data: EMPTY_FC },
        'causal-arcs': { type: 'geojson', data: EMPTY_FC },
        'causal-particles': { type: 'geojson', data: EMPTY_FC },
        'causal-points': { type: 'geojson', data: EMPTY_FC },
      },
      layers: [
        {
          id: 'ocean-bg',
          type: 'background',
          paint: { 'background-color': palette.ocean },
        },
        {
          id: 'graticule-lines',
          type: 'line',
          source: 'graticule',
          paint: {
            'line-color': palette.graticule,
            'line-width': ['match', ['get', 'kind'], 'equator', 1.1, 'prime', 1.1, 0.7],
          },
        },
        {
          id: 'physical-land-fill',
          type: 'fill',
          source: 'physical-land',
          paint: {
            'fill-color': palette.land,
            'fill-outline-color': palette.landBorder,
          },
        },
        {
          id: 'physical-relief-fill',
          type: 'fill',
          source: 'physical-relief',
          paint: {
            'fill-color': [
              'match',
              ['get', 'k'],
              'Desert',
              palette.desert,
              'Plateau',
              palette.plateau,
              palette.mountain,
            ],
          },
        },
        {
          id: 'empire-fills-a',
          type: 'fill',
          source: 'empires-a',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': buildEmpireFillOpacityExpr(palette.empireFillOpacity, 1),
          },
        },
        {
          id: 'empire-fills-b',
          type: 'fill',
          source: 'empires-b',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0,
          },
        },
        {
          id: 'physical-lakes-fill',
          type: 'fill',
          source: 'physical-lakes',
          paint: {
            'fill-color': palette.water,
            'fill-opacity': 0.85,
          },
        },
        {
          id: 'physical-rivers-line',
          type: 'line',
          source: 'physical-rivers',
          paint: {
            'line-color': palette.river,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.65, 5, 1.6],
            'line-opacity': 0.72,
          },
        },
        {
          id: 'empire-borders-a',
          type: 'line',
          source: 'empires-a',
          paint: {
            'line-color': palette.empireBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 1.3],
            'line-opacity': 1,
          },
        },
        {
          id: 'empire-borders-b',
          type: 'line',
          source: 'empires-b',
          paint: {
            'line-color': palette.empireBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 1.3],
            'line-opacity': 0,
          },
        },
        {
          id: 'historical-routes-glow',
          type: 'line',
          source: 'routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['case', ['==', ['get', 'focused'], 1], 7, 4.5],
            'line-opacity': ['case', ['==', ['get', 'focused'], 1], 0.38, 0.18],
          },
        },
        {
          id: 'historical-routes-line',
          type: 'line',
          source: 'routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['case', ['==', ['get', 'focused'], 1], 3.2, 2],
            'line-dasharray': [2.2, 1.4],
            'line-opacity': ['case', ['==', ['get', 'focused'], 1], 0.96, 0.78],
          },
        },
        {
          id: 'route-particles-halo',
          type: 'circle',
          source: 'route-particles',
          paint: {
            'circle-radius': ['case', ['==', ['get', 'focused'], 1], 7.5, 5.5],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.34,
            'circle-blur': 0.7,
          },
        },
        {
          id: 'route-particles-core',
          type: 'circle',
          source: 'route-particles',
          paint: {
            'circle-radius': ['case', ['==', ['get', 'focused'], 1], 3.4, 2.5],
            'circle-color': '#FFFBEB',
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-width': 1.2,
            'circle-opacity': 0.96,
          },
        },
        {
          id: 'causal-arcs-line',
          type: 'line',
          source: 'causal-arcs',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'kind'], 'cause', '#D97706', '#059669'],
            'line-width': 2.2,
            'line-dasharray': [1.5, 1.2],
            'line-opacity': 0.9,
          },
        },
        {
          id: 'causal-particles-halo',
          type: 'circle',
          source: 'causal-particles',
          paint: {
            'circle-radius': 6.5,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.35,
            'circle-blur': 0.6,
          },
        },
        {
          id: 'causal-particles-core',
          type: 'circle',
          source: 'causal-particles',
          paint: {
            'circle-radius': 2.8,
            'circle-color': '#FFFFFF',
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-width': 1.2,
          },
        },
        {
          id: 'causal-points-circle',
          type: 'circle',
          source: 'causal-points',
          paint: {
            'circle-radius': 4.5,
            'circle-color': ['match', ['get', 'kind'], 'cause', '#D97706', '#059669'],
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 1.5,
          },
        },
        {
          id: 'empire-labels',
          type: 'symbol',
          source: 'empire-labels',
          layout: {
            'text-field': ['get', 'zhName'],
            'text-font': ['atlas'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 10, 4, 13, 6, 15],
            'text-max-width': 8,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'symbol-sort-key': ['get', 'rank'],
          },
          paint: {
            'text-color': palette.labelColor,
            'text-halo-color': palette.labelHalo,
            'text-halo-width': 1.5,
            'text-opacity': [
              'step',
              ['zoom'],
              ['case', ['<=', ['get', 'rank'], 18], 0.85, 0],
              2.6,
              ['case', ['<=', ['get', 'rank'], 38], 0.88, 0],
              4.0,
              0.92,
            ],
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container,
      style: initialStyle,
      center: window.innerWidth >= 1024 ? [52, 22] : [28, 22],
      zoom: window.innerWidth < 640 ? 1.15 : 1.38,
      minZoom: 0.9,
      maxZoom: 8.5,
      attributionControl: false,
      localIdeographFontFamily:
        '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '疆域: historical-basemaps | 地形: Natural Earth',
      }),
      'bottom-left',
    );

    if (window.innerWidth >= 768) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    }

    let hoveredFeature: { source: 'empires-a' | 'empires-b'; id: string | number } | null = null;

    map.on('load', () => {
      setMapReady(true);
    });
    if (map.loaded()) {
      setMapReady(true);
    }
    map.on('error', (e) => {
      console.error('[WorldMap] MapLibre error:', e.error || e);
    });
    map.on('move', () => {
      syncGlobeMarkerVisibility(map);
    });

    const handleEmpireMove = (buf: 'a' | 'b', e: maplibregl.MapLayerMouseEvent) => {
      if (activeBufferRef.current !== buf) return;
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const sourceName = `empires-${buf}` as 'empires-a' | 'empires-b';
      map.getCanvas().style.cursor = 'pointer';
      if (
        hoveredFeature !== null &&
        (hoveredFeature.source !== sourceName || hoveredFeature.id !== feat.id)
      ) {
        map.setFeatureState({ source: hoveredFeature.source, id: hoveredFeature.id }, { hover: false });
      }
      if (feat.id !== undefined) {
        hoveredFeature = { source: sourceName, id: feat.id };
        map.setFeatureState({ source: sourceName, id: feat.id }, { hover: true });
      }
      const props = (feat.properties || {}) as { zhName?: string; enName?: string };
      setHoveredPolity({
        zhName: props.zhName || '未知政权',
        enName: props.enName || '',
        x: e.point.x,
        y: e.point.y,
      });
    };

    const handleEmpireLeave = (buf: 'a' | 'b') => {
      if (activeBufferRef.current !== buf) return;
      map.getCanvas().style.cursor = '';
      if (hoveredFeature !== null) {
        map.setFeatureState({ source: hoveredFeature.source, id: hoveredFeature.id }, { hover: false });
        hoveredFeature = null;
      }
      setHoveredPolity(null);
    };

    map.on('mousemove', 'empire-fills-a', (e) => handleEmpireMove('a', e));
    map.on('mousemove', 'empire-fills-b', (e) => handleEmpireMove('b', e));
    map.on('mouseleave', 'empire-fills-a', () => handleEmpireLeave('a'));
    map.on('mouseleave', 'empire-fills-b', () => handleEmpireLeave('b'));

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      const activeLayer = activeBufferRef.current === 'a' ? 'empire-fills-a' : 'empire-fills-b';
      const features = map.queryRenderedFeatures(e.point, { layers: [activeLayer] });
      if (features.length > 0) {
        const props = (features[0].properties || {}) as {
          zhName?: string;
          enName?: string;
          groupZhName?: string;
        };
        setClickedPolity({
          zhName: props.zhName || '未知政权',
          enName: props.enName || '',
          groupZhName: props.groupZhName || '',
          snapshotYear: snapshotYearRef.current,
        });
      } else {
        setClickedPolity(null);
        onDeselectRef.current?.();
      }
    });

    mapRef.current = map;
    return () => {
      window.cancelAnimationFrame(crossfadeRafRef.current);
      for (const { marker } of markersRef.current.values()) {
        marker.remove();
      }
      markersRef.current.clear();
      for (const { marker } of figureMarkersRef.current.values()) {
        marker.remove();
      }
      figureMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // Only initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme paints dynamically without resetting style
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const p = THEME_COLORS[theme];
    map.setPaintProperty('ocean-bg', 'background-color', p.ocean);
    map.setPaintProperty('graticule-lines', 'line-color', p.graticule);
    map.setPaintProperty('physical-land-fill', 'fill-color', p.land);
    map.setPaintProperty('physical-land-fill', 'fill-outline-color', p.landBorder);
    map.setPaintProperty('physical-relief-fill', 'fill-color', [
      'match',
      ['get', 'k'],
      'Desert',
      p.desert,
      'Plateau',
      p.plateau,
      p.mountain,
    ]);
    map.setPaintProperty('physical-lakes-fill', 'fill-color', p.water);
    map.setPaintProperty('physical-rivers-line', 'line-color', p.river);
    const activeBuf = activeBufferRef.current;
    const inactiveBuf = activeBuf === 'a' ? 'b' : 'a';
    map.setPaintProperty(
      `empire-fills-${activeBuf}`,
      'fill-opacity',
      buildEmpireFillOpacityExpr(p.empireFillOpacity, 1),
    );
    map.setPaintProperty(`empire-fills-${inactiveBuf}`, 'fill-opacity', 0);
    map.setPaintProperty('empire-borders-a', 'line-color', p.empireBorder);
    map.setPaintProperty('empire-borders-b', 'line-color', p.empireBorder);
    map.setPaintProperty('empire-labels', 'text-color', p.labelColor);
    map.setPaintProperty('empire-labels', 'text-halo-color', p.labelHalo);
  }, [theme, mapReady]);

  // Update projection live
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setProjection({ type: projection });
    syncGlobeMarkerVisibility(map);
    const raf = window.requestAnimationFrame(() => syncGlobeMarkerVisibility(map));
    return () => window.cancelAnimationFrame(raf);
  }, [projection, mapReady, syncGlobeMarkerVisibility]);

  // Update physical layers when loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !physical) return;
    (map.getSource('physical-land') as maplibregl.GeoJSONSource | undefined)?.setData(physical.land);
    (map.getSource('physical-relief') as maplibregl.GeoJSONSource | undefined)?.setData(
      physical.relief,
    );
    (map.getSource('physical-lakes') as maplibregl.GeoJSONSource | undefined)?.setData(
      physical.lakes,
    );
    (map.getSource('physical-rivers') as maplibregl.GeoJSONSource | undefined)?.setData(
      physical.rivers,
    );
  }, [physical, mapReady]);

  // Update historical empire polygons & labels with smooth 480ms dual-buffer cross-fade
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !snapshot) return;

    (map.getSource('empire-labels') as maplibregl.GeoJSONSource | undefined)?.setData(
      snapshot.labels,
    );

    const palette = THEME_COLORS[themeRef.current];
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (lastSnapshotYearRef.current === null || lastSnapshotYearRef.current === snapshot.year || reducedMotion) {
      window.cancelAnimationFrame(crossfadeRafRef.current);
      const curBuf = activeBufferRef.current;
      const otherBuf = curBuf === 'a' ? 'b' : 'a';
      (map.getSource(`empires-${curBuf}`) as maplibregl.GeoJSONSource | undefined)?.setData(
        snapshot.polygons,
      );
      (map.getSource(`empires-${otherBuf}`) as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY_FC);
      map.setPaintProperty(
        `empire-fills-${curBuf}`,
        'fill-opacity',
        buildEmpireFillOpacityExpr(palette.empireFillOpacity, 1),
      );
      map.setPaintProperty(`empire-borders-${curBuf}`, 'line-opacity', 1);
      map.setPaintProperty(`empire-fills-${otherBuf}`, 'fill-opacity', 0);
      map.setPaintProperty(`empire-borders-${otherBuf}`, 'line-opacity', 0);
      lastSnapshotYearRef.current = snapshot.year;
      return;
    }

    window.cancelAnimationFrame(crossfadeRafRef.current);
    const incomingBuf = activeBufferRef.current === 'a' ? 'b' : 'a';
    const outgoingBuf = activeBufferRef.current;
    activeBufferRef.current = incomingBuf;
    lastSnapshotYearRef.current = snapshot.year;

    (map.getSource(`empires-${incomingBuf}`) as maplibregl.GeoJSONSource | undefined)?.setData(
      snapshot.polygons,
    );

    const startTime = performance.now();
    const duration = 480;

    const animateFade = (now: number) => {
      if (!mapRef.current) return;
      const rawT = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - rawT, 3);
      const fillBase = THEME_COLORS[themeRef.current].empireFillOpacity;

      try {
        mapRef.current.setPaintProperty(
          `empire-fills-${incomingBuf}`,
          'fill-opacity',
          buildEmpireFillOpacityExpr(fillBase, eased),
        );
        mapRef.current.setPaintProperty(`empire-borders-${incomingBuf}`, 'line-opacity', eased);

        const outFactor = 1 - eased;
        mapRef.current.setPaintProperty(
          `empire-fills-${outgoingBuf}`,
          'fill-opacity',
          buildEmpireFillOpacityExpr(fillBase, outFactor),
        );
        mapRef.current.setPaintProperty(`empire-borders-${outgoingBuf}`, 'line-opacity', outFactor);
      } catch {
        // Ignore transient style swaps
      }

      if (rawT < 1) {
        crossfadeRafRef.current = window.requestAnimationFrame(animateFade);
      } else {
        (
          mapRef.current.getSource(`empires-${outgoingBuf}`) as maplibregl.GeoJSONSource | undefined
        )?.setData(EMPTY_FC);
      }
    };

    crossfadeRafRef.current = window.requestAnimationFrame(animateFade);
    return () => window.cancelAnimationFrame(crossfadeRafRef.current);
  }, [snapshot, mapReady]);

  // Update historical routes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (map.getSource('routes') as maplibregl.GeoJSONSource | undefined)?.setData(routesRenderMeta.geojson);
  }, [routesRenderMeta, mapReady]);

  // Update causal arcs
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (map.getSource('causal-arcs') as maplibregl.GeoJSONSource | undefined)?.setData(causalGeoJSON.arcs);
    (map.getSource('causal-points') as maplibregl.GeoJSONSource | undefined)?.setData(
      causalGeoJSON.points,
    );
  }, [causalGeoJSON, mapReady]);

  // Luminous flow particles (~30fps) & route dash animation along revealed routes and causal arcs
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const routeParticlesSrc = map.getSource('route-particles') as maplibregl.GeoJSONSource | undefined;
    const causalParticlesSrc = map.getSource('causal-particles') as maplibregl.GeoJSONSource | undefined;

    if (
      reducedMotion ||
      (routesRenderMeta.particlesMeta.length === 0 && causalGeoJSON.arcsMeta.length === 0)
    ) {
      routeParticlesSrc?.setData(EMPTY_FC);
      causalParticlesSrc?.setData(EMPTY_FC);
      return;
    }

    const patterns: [number, number, number, number][] = [
      [2.2, 1.4, 0.01, 0.01],
      [1.6, 1.4, 0.6, 0.01],
      [1.0, 1.4, 1.2, 0.01],
      [0.4, 1.4, 1.8, 0.01],
      [0.01, 1.0, 2.2, 0.4],
    ];

    let rafId = 0;
    let lastDraw = 0;
    let lastDash = 0;
    let dashStep = 0;
    const speedFactor = isPlaying ? 1.35 : 1;

    const loop = (now: number) => {
      if (!mapRef.current) return;
      if (document.hidden || now - lastDraw < 33) {
        rafId = window.requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;

      if (routesRenderMeta.particlesMeta.length > 0 && now - lastDash >= 140) {
        lastDash = now;
        dashStep = (dashStep + 1) % patterns.length;
        try {
          mapRef.current.setPaintProperty('historical-routes-line', 'line-dasharray', patterns[dashStep]);
        } catch {
          // Ignore transient style changes
        }
      }

      if (routeParticlesSrc) {
        const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
        const phase = ((now * 0.00016 * speedFactor) % 1 + 1) % 1;
        for (const rm of routesRenderMeta.particlesMeta) {
          if (rm.coords.length < 2) continue;
          const count = rm.focused ? 4 : 2;
          for (let i = 0; i < count; i++) {
            const f = (phase + i / count) % 1;
            const pt = samplePolylineAt(rm.coords, rm.cum, f);
            features.push({
              type: 'Feature',
              properties: { color: rm.color, focused: rm.focused ? 1 : 0 },
              geometry: { type: 'Point', coordinates: pt },
            });
            if (rm.bidirectional) {
              const revPt = samplePolylineAt(rm.coords, rm.cum, (1 - f + 1) % 1);
              features.push({
                type: 'Feature',
                properties: { color: rm.color, focused: rm.focused ? 1 : 0 },
                geometry: { type: 'Point', coordinates: revPt },
              });
            }
          }
        }
        routeParticlesSrc.setData({ type: 'FeatureCollection', features });
      }

      if (causalParticlesSrc) {
        const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
        const cPhase = ((now * 0.00032) % 1 + 1) % 1;
        for (const arc of causalGeoJSON.arcsMeta) {
          if (arc.coords.length < 2) continue;
          for (let i = 0; i < 2; i++) {
            const pt = samplePolylineAt(arc.coords, arc.cum, (cPhase + i * 0.5) % 1);
            features.push({
              type: 'Feature',
              properties: { color: arc.color },
              geometry: { type: 'Point', coordinates: pt },
            });
          }
        }
        causalParticlesSrc.setData({ type: 'FeatureCollection', features });
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [routesRenderMeta, causalGeoJSON, isPlaying, mapReady]);

  // Handle smooth camera easing when selecting an event or stepping storyline / cinema mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !flyTarget) return;
    const isDesktop = window.innerWidth >= 1024;
    const targetPitch = projectionRef.current === 'globe' ? 0 : (flyTarget.pitch ?? 0);
    map.easeTo({
      center: flyTarget.center,
      zoom: Math.max(map.getZoom(), flyTarget.zoom),
      pitch: targetPitch,
      duration: flyTarget.duration ?? 850,
      padding: isDesktop
        ? { top: 28, bottom: 32, left: 24, right: 430 }
        : { top: 24, bottom: 220, left: 16, right: 16 },
    });
  }, [flyTarget, mapReady]);

  // Render & synchronize HTML event markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentMap = markersRef.current;
    const desiredIds = new Set(events.map((e) => e.event.id));

    // Remove obsolete markers
    for (const [id, entry] of currentMap.entries()) {
      if (!desiredIds.has(id)) {
        entry.marker.remove();
        currentMap.delete(id);
      }
    }

    // Create or update markers
    for (const item of events) {
      const { event, active, opacity } = item;
      const isSelected = selectedEvent?.id === event.id;
      const isTriggered = recentTriggerEventId === event.id;
      const isMastered = masteredIds.has(event.id);
      const isBookmarked = bookmarkedIds.has(event.id);
      const dim = DIMENSION_META[event.primaryDimension];
      const pinColor = theme === 'obsidian' ? dim.darkColor : dim.color;

      let entry = currentMap.get(event.id);
      if (!entry) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', event.title);
        btn.className =
          'group relative flex items-center justify-center focus:outline-none select-none cursor-pointer';
        btn.style.width = '36px';
        btn.style.height = '36px';
        btn.style.background = 'transparent';
        btn.style.border = 'none';
        btn.style.padding = '0';

        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectRef.current(event);
        });

        const marker = new maplibregl.Marker({ element: btn, anchor: 'center' })
          .setLngLat(event.coords)
          .addTo(map);
        entry = { marker, el: btn, coords: event.coords };
        currentMap.set(event.id, entry);
      }

      entry.coords = event.coords;
      const btn = entry.el;
      btn.style.opacity = String(isSelected || isTriggered ? 1 : opacity);
      btn.style.zIndex = isSelected || isTriggered ? '35' : active ? (event.importance === 3 ? '20' : '12') : '5';

      const sizePx = isSelected || isTriggered ? 18 : event.importance === 3 ? 14 : 11;
      const borderColor = isSelected || isTriggered ? '#FFFFFF' : theme === 'obsidian' ? '#0D141D' : '#FBF8F1';

      btn.innerHTML = `
        ${
          isTriggered
            ? `<span class="atlas-shockwave absolute left-1/2 top-1/2 rounded-full pointer-events-none" style="width:26px;height:26px;border:2px solid ${pinColor};background:${pinColor}24;"></span><span class="atlas-shockwave-delayed absolute left-1/2 top-1/2 rounded-full pointer-events-none" style="width:26px;height:26px;border:1.8px solid ${pinColor};"></span>`
            : isSelected
              ? `<span class="atlas-beacon absolute left-1/2 top-1/2 rounded-full pointer-events-none" style="width:26px;height:26px;border:2px solid ${pinColor};background:${pinColor}33;"></span>`
              : ''
        }
        <span class="relative block rounded-full transition-transform duration-150 group-hover:scale-125" style="width:${sizePx}px;height:${sizePx}px;background:${pinColor};border:2.2px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.32);">
          ${
            isMastered
              ? `<span style="position:absolute;right:-4px;top:-4px;width:8px;height:8px;border-radius:9999px;background:#10B981;border:1.5px solid #fff;"></span>`
              : isBookmarked
                ? `<span style="position:absolute;right:-4px;top:-4px;width:8px;height:8px;border-radius:9999px;background:#F59E0B;border:1.5px solid #fff;"></span>`
                : ''
          }
        </span>
        <span class="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] shadow-sm transition-opacity ${
          isSelected
            ? 'opacity-100 font-semibold max-w-[210px] sm:max-w-none truncate'
            : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 font-medium'
        }" style="background:${
          theme === 'obsidian' ? 'rgba(20,30,43,0.92)' : 'rgba(251,248,241,0.92)'
        };color:${theme === 'obsidian' ? '#EEF2F7' : '#1F1A14'};border:1px solid ${
          isSelected ? pinColor : 'rgba(120,100,72,0.24)'
        };">${event.title}</span>
      `;
    }
    syncGlobeMarkerVisibility(map);
  }, [
    events,
    selectedEvent,
    recentTriggerEventId,
    masteredIds,
    bookmarkedIds,
    theme,
    mapReady,
    syncGlobeMarkerVisibility,
  ]);

  // Render & synchronize HTML historical figure portrait seals
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentMap = figureMarkersRef.current;
    const desiredIds = new Set(figures.map((f) => f.figure.id));

    for (const [id, entry] of currentMap.entries()) {
      if (!desiredIds.has(id)) {
        entry.marker.remove();
        currentMap.delete(id);
      }
    }

    for (const item of figures) {
      const { figure, active, opacity } = item;
      const isSelected = selectedFigure?.id === figure.id;
      const isMastered = masteredIds.has(figure.id);
      const isBookmarked = bookmarkedIds.has(figure.id);
      const roleMeta = FIGURE_ROLE_META[figure.role];
      const roleColor = theme === 'obsidian' ? roleMeta.darkColor : roleMeta.color;

      let entry = currentMap.get(figure.id);
      if (!entry) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', `人物：${figure.name}`);
        btn.className =
          'group relative flex items-center justify-center focus:outline-none select-none cursor-pointer';
        btn.style.width = '34px';
        btn.style.height = '34px';
        btn.style.background = 'transparent';
        btn.style.border = 'none';
        btn.style.padding = '0';

        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectFigureRef.current(figure);
        });

        const marker = new maplibregl.Marker({ element: btn, anchor: 'center' })
          .setLngLat(figure.coords)
          .addTo(map);
        entry = { marker, el: btn, coords: figure.coords };
        currentMap.set(figure.id, entry);
      }

      entry.coords = figure.coords;
      const overlapsEvent = events.some(
        (e) =>
          Math.abs(e.event.coords[0] - figure.coords[0]) < 0.65 &&
          Math.abs(e.event.coords[1] - figure.coords[1]) < 0.65,
      );
      entry.marker.setOffset(overlapsEvent ? [16, -14] : [0, 0]);

      const btn = entry.el;
      btn.style.opacity = String(isSelected ? 1 : opacity);
      btn.style.zIndex = isSelected ? '36' : active ? (figure.importance === 3 ? '21' : '14') : '6';

      const sizePx = isSelected ? 26 : figure.importance === 3 ? 21 : 18;
      const borderColor = isSelected ? '#FFFFFF' : theme === 'obsidian' ? '#0D141D' : '#FBF8F1';
      const fontSizePx = isSelected ? 12 : 10;

      btn.innerHTML = `
        ${
          isSelected
            ? `<span class="atlas-beacon absolute left-1/2 top-1/2 rounded-lg pointer-events-none" style="width:32px;height:32px;border:2px solid ${roleColor};background:${roleColor}33;"></span>`
            : ''
        }
        <span class="relative flex items-center justify-center rounded-md font-bold text-white transition-transform duration-150 group-hover:scale-125" style="width:${sizePx}px;height:${sizePx}px;font-size:${fontSizePx}px;background:${roleColor};border:1.8px solid ${borderColor};box-shadow:0 2px 7px rgba(0,0,0,0.34);">
          ${figure.monogram}
          ${
            isMastered
              ? `<span style="position:absolute;right:-4px;top:-4px;width:8px;height:8px;border-radius:9999px;background:#10B981;border:1.5px solid #fff;"></span>`
              : isBookmarked
                ? `<span style="position:absolute;right:-4px;top:-4px;width:8px;height:8px;border-radius:9999px;background:#F59E0B;border:1.5px solid #fff;"></span>`
                : ''
          }
        </span>
        <span class="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] shadow-sm transition-opacity ${
          isSelected
            ? 'opacity-100 font-semibold max-w-[210px] sm:max-w-none truncate'
            : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 font-medium'
        }" style="background:${
          theme === 'obsidian' ? 'rgba(20,30,43,0.92)' : 'rgba(251,248,241,0.94)'
        };color:${theme === 'obsidian' ? '#EEF2F7' : '#1F1A14'};border:1px solid ${
          isSelected ? roleColor : 'rgba(120,100,72,0.28)'
        };">${isSelected ? `${figure.name} · ${figure.lifespanDisplay}` : `人物 · ${figure.name}（${figure.lifespanDisplay}）`}</span>
      `;
    }
    syncGlobeMarkerVisibility(map);
  }, [figures, events, selectedFigure, masteredIds, bookmarkedIds, theme, mapReady, syncGlobeMarkerVisibility]);

  return (
    <div className="relative z-0 isolate h-full w-full select-none">
      <div ref={containerRef} className="h-full w-full" />

      {/* Hovered polity tooltip on desktop */}
      {hoveredPolity && (
        <div
          className="pointer-events-none absolute z-20 hidden md:block rounded-lg px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm"
          style={{
            left: Math.min(hoveredPolity.x + 14, window.innerWidth - 220),
            top: Math.max(hoveredPolity.y - 36, 72),
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="font-semibold">{hoveredPolity.zhName}</div>
          {hoveredPolity.enName !== hoveredPolity.zhName && (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {hoveredPolity.enName}
            </div>
          )}
        </div>
      )}

      {/* Clicked/tapped polity inspection pill */}
      {clickedPolity && (
        <div
          className="absolute left-3 bottom-16 lg:bottom-8 z-20 flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs shadow-lg backdrop-blur-md"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{clickedPolity.zhName}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
              >
                {formatShortYear(clickedPolity.snapshotYear)} 版图
              </span>
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {clickedPolity.enName}
              {clickedPolity.groupZhName && clickedPolity.groupZhName !== clickedPolity.zhName
                ? ` · 归属：${clickedPolity.groupZhName}`
                : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClickedPolity(null)}
            className="rounded-md px-1.5 py-0.5 text-xs hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="关闭政权信息"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
