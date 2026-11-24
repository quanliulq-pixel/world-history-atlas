import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DIMENSION_META, FIGURE_ROLE_META } from '../data/eras';
import { EVENT_MAP } from '../data/events';
import { GEO_FEATURES } from '../data/geoFeatures';
import { HISTORICAL_MEGA_STRUCTURES, HISTORICAL_PLACES } from '../data/historicalPlaces';
import type {
  ClickedPolityPayload,
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

export interface CountryFocusSpec {
  accentColor: string;
  matchEnNames: string[];
  matchZhNames: string[];
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
  showRelief?: boolean;
  showLandmarks?: boolean;
  countryFocus?: CountryFocusSpec | null;
  isCountryMode?: boolean;
  flyTarget: {
    center: [number, number];
    zoom: number;
    exactZoom?: boolean;
    pitch?: number;
    duration?: number;
    nonce: number;
  } | null;
  onSelectEvent: (ev: HistoryEvent) => void;
  onSelectFigure: (fig: HistoricalFigure) => void;
  onSelectPolity?: (polity: ClickedPolityPayload) => void;
  onDeselectEvent?: () => void;
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const NONE_FILTER: maplibregl.FilterSpecification = ['==', ['get', 'zhName'], '__none__'];

function buildCountryFocusFilter(
  focus: CountryFocusSpec | null | undefined,
): maplibregl.FilterSpecification {
  if (!focus || (focus.matchEnNames.length === 0 && focus.matchZhNames.length === 0)) {
    return NONE_FILTER;
  }
  const clauses: maplibregl.ExpressionSpecification[] = [];
  if (focus.matchEnNames.length > 0) {
    clauses.push(['in', ['get', 'enName'], ['literal', focus.matchEnNames]]);
    clauses.push(['in', ['get', 'groupEnName'], ['literal', focus.matchEnNames]]);
  }
  if (focus.matchZhNames.length > 0) {
    clauses.push(['in', ['get', 'zhName'], ['literal', focus.matchZhNames]]);
  }
  return ['any', ...clauses] as maplibregl.FilterSpecification;
}

const THEME_COLORS = {
  parchment: {
    ocean: '#C6DCE4',
    graticule: 'rgba(65, 92, 110, 0.14)',
    land: '#E8DFCB',
    landBorder: 'rgba(120, 100, 72, 0.34)',
    mountain: 'rgba(148, 121, 86, 0.20)',
    desert: 'rgba(219, 184, 116, 0.24)',
    plateau: 'rgba(176, 146, 103, 0.18)',
    water: '#92BDD0',
    river: '#6C9FB7',
    empireFillOpacity: 0.54,
    empireBorder: 'rgba(54, 41, 28, 0.44)',
    empireHover: 'rgba(255, 250, 235, 0.28)',
    labelColor: '#2B2116',
    labelHalo: 'rgba(248, 242, 228, 0.90)',
    geoWaterColor: '#3A6B88',
    geoLandColor: '#6D5840',
    geoHalo: 'rgba(248, 242, 228, 0.84)',
    placeText: '#2A1F14',
    placeHalo: 'rgba(251, 248, 241, 0.92)',
  },
  obsidian: {
    ocean: '#0C1824',
    graticule: 'rgba(140, 175, 210, 0.11)',
    land: '#1D2733',
    landBorder: 'rgba(148, 173, 198, 0.24)',
    mountain: 'rgba(92, 112, 134, 0.24)',
    desert: 'rgba(138, 114, 72, 0.18)',
    plateau: 'rgba(88, 108, 128, 0.20)',
    water: '#132E45',
    river: '#2F6288',
    empireFillOpacity: 0.48,
    empireBorder: 'rgba(222, 234, 246, 0.34)',
    empireHover: 'rgba(255, 255, 255, 0.18)',
    labelColor: '#EEF3F9',
    labelHalo: 'rgba(14, 24, 36, 0.90)',
    geoWaterColor: '#79B1D4',
    geoLandColor: '#A99C88',
    geoHalo: 'rgba(14, 24, 36, 0.86)',
    placeText: '#F1F5F9',
    placeHalo: 'rgba(14, 24, 36, 0.92)',
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
  showRelief = true,
  showLandmarks = true,
  countryFocus = null,
  isCountryMode = false,
  flyTarget,
  onSelectEvent,
  onSelectFigure,
  onSelectPolity,
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
  const onSelectPolityRef = useRef(onSelectPolity);
  onSelectPolityRef.current = onSelectPolity;
  const onDeselectRef = useRef(onDeselectEvent);
  onDeselectRef.current = onDeselectEvent;
  const isCountryModeRef = useRef(isCountryMode);
  isCountryModeRef.current = isCountryMode;
  const countryFocusRef = useRef(countryFocus);
  countryFocusRef.current = countryFocus;
  const snapshotYearRef = useRef<number>(snapshot?.year ?? -3000);
  snapshotYearRef.current = snapshot?.year ?? -3000;
  const showReliefRef = useRef(showRelief);
  showReliefRef.current = showRelief;
  const showLandmarksRef = useRef(showLandmarks);
  showLandmarksRef.current = showLandmarks;
  const pointerOverMarkerRef = useRef(false);

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

  const geoLabelsData = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection',
      features: GEO_FEATURES.map((g) => ({
        type: 'Feature',
        properties: { name: g.name, kind: g.kind, minZoom: g.minZoom },
        geometry: { type: 'Point', coordinates: g.coords },
      })),
    }),
    [],
  );

  const placesGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => {
    const activePlaces = HISTORICAL_PLACES.filter(
      (pl) => currentYear >= pl.startYear && currentYear <= pl.endYear,
    );
    return {
      type: 'FeatureCollection',
      features: activePlaces.map((pl) => ({
        type: 'Feature',
        properties: { name: pl.name, kind: pl.kind, minZoom: pl.minZoom },
        geometry: { type: 'Point', coordinates: pl.coords },
      })),
    };
  }, [currentYear]);

  const megaStructuresGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(() => {
    const activeStructures = HISTORICAL_MEGA_STRUCTURES.filter(
      (ms) => currentYear >= ms.startYear && currentYear <= ms.endYear,
    );
    return {
      type: 'FeatureCollection',
      features: activeStructures.map((ms) => ({
        type: 'Feature',
        properties: { name: ms.name, kind: ms.kind, color: ms.color },
        geometry: { type: 'LineString', coordinates: ms.coords },
      })),
    };
  }, [currentYear]);

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
        'shaded-relief': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          maxzoom: 13,
          attribution: '地形浮雕: Esri World Shaded Relief',
        },
        graticule: { type: 'geojson', data: graticuleData },
        'physical-land': { type: 'geojson', data: EMPTY_FC },
        'physical-relief': { type: 'geojson', data: EMPTY_FC },
        'physical-lakes': { type: 'geojson', data: EMPTY_FC },
        'physical-rivers': { type: 'geojson', data: EMPTY_FC },
        'empires-a': { type: 'geojson', data: EMPTY_FC, generateId: true },
        'empires-b': { type: 'geojson', data: EMPTY_FC, generateId: true },
        'mega-structures': { type: 'geojson', data: megaStructuresGeoJSON },
        'geo-labels': { type: 'geojson', data: geoLabelsData },
        'empire-labels': { type: 'geojson', data: EMPTY_FC },
        'historical-places': { type: 'geojson', data: placesGeoJSON },
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
          id: 'shaded-relief-layer',
          type: 'raster',
          source: 'shaded-relief',
          paint: {
            'raster-opacity': showReliefRef.current ? (theme === 'obsidian' ? 0.24 : 0.62) : 0,
            'raster-contrast': theme === 'obsidian' ? 0.24 : 0.16,
            'raster-saturation': theme === 'obsidian' ? -0.82 : -0.25,
            'raster-brightness-min': theme === 'obsidian' ? 0 : 0.08,
            'raster-brightness-max': theme === 'obsidian' ? 0.42 : 1,
            'raster-opacity-transition': { duration: 150, delay: 0 },
          },
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
            'fill-opacity': showReliefRef.current ? (theme === 'obsidian' ? 0.62 : 0.42) : 1,
            'fill-opacity-transition': { duration: 150, delay: 0 },
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
            'fill-opacity': palette.empireFillOpacity,
            'fill-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-fills-b',
          type: 'fill',
          source: 'empires-b',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0,
            'fill-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-hover-a',
          type: 'fill',
          source: 'empires-a',
          filter: ['==', ['get', 'zhName'], '__none__'],
          paint: {
            'fill-color': palette.empireHover,
            'fill-opacity': 1,
            'fill-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-hover-b',
          type: 'fill',
          source: 'empires-b',
          filter: ['==', ['get', 'zhName'], '__none__'],
          paint: {
            'fill-color': palette.empireHover,
            'fill-opacity': 1,
            'fill-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-focus-fill-a',
          type: 'fill',
          source: 'empires-a',
          filter: NONE_FILTER,
          paint: {
            'fill-color': '#D97706',
            'fill-opacity': 0,
            'fill-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-focus-fill-b',
          type: 'fill',
          source: 'empires-b',
          filter: NONE_FILTER,
          paint: {
            'fill-color': '#D97706',
            'fill-opacity': 0,
            'fill-opacity-transition': { duration: 0, delay: 0 },
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
          id: 'empire-border-glow-a',
          type: 'line',
          source: 'empires-a',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['get', 'fillColor'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2.0, 5, 5.6],
            'line-blur': 1.6,
            'line-opacity': 0.34,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-border-glow-b',
          type: 'line',
          source: 'empires-b',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['get', 'fillColor'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2.0, 5, 5.6],
            'line-blur': 1.6,
            'line-opacity': 0,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-borders-solid-a',
          type: 'line',
          source: 'empires-a',
          filter: ['>=', ['get', 'bp'], 2],
          paint: {
            'line-color': palette.empireBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.75, 5, 1.5],
            'line-opacity': 0.95,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-borders-dashed-a',
          type: 'line',
          source: 'empires-a',
          filter: ['<', ['get', 'bp'], 2],
          paint: {
            'line-color': palette.empireBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.55, 5, 1.2],
            'line-dasharray': [5, 2.5],
            'line-opacity': 0.78,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-borders-solid-b',
          type: 'line',
          source: 'empires-b',
          filter: ['>=', ['get', 'bp'], 2],
          paint: {
            'line-color': palette.empireBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.75, 5, 1.5],
            'line-opacity': 0,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-borders-dashed-b',
          type: 'line',
          source: 'empires-b',
          filter: ['<', ['get', 'bp'], 2],
          paint: {
            'line-color': palette.empireBorder,
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.55, 5, 1.2],
            'line-dasharray': [5, 2.5],
            'line-opacity': 0,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-focus-border-a',
          type: 'line',
          source: 'empires-a',
          filter: NONE_FILTER,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#D97706',
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2.0, 5, 3.6],
            'line-opacity': 0,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'empire-focus-border-b',
          type: 'line',
          source: 'empires-b',
          filter: NONE_FILTER,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#D97706',
            'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2.0, 5, 3.6],
            'line-opacity': 0,
            'line-opacity-transition': { duration: 0, delay: 0 },
          },
        },
        {
          id: 'mega-structures-wall-casing',
          type: 'line',
          source: 'mega-structures',
          filter: ['==', ['get', 'kind'], 'wall'],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'line-color': 'rgba(255, 248, 232, 0.72)',
            'line-width': ['interpolate', ['linear'], ['zoom'], 2, 3.2, 6, 6.2],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 1.8, 0, 2.8, 0.82],
          },
        },
        {
          id: 'mega-structures-wall',
          type: 'line',
          source: 'mega-structures',
          filter: ['==', ['get', 'kind'], 'wall'],
          layout: {
            'line-cap': 'butt',
            'line-join': 'round',
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.8, 6, 3.4],
            'line-dasharray': [2.2, 1.1],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 1.8, 0, 2.8, 0.92],
          },
        },
        {
          id: 'mega-structures-canal',
          type: 'line',
          source: 'mega-structures',
          filter: ['==', ['get', 'kind'], 'canal'],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.6, 6, 3.2],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 2.2, 0, 3.1, 0.88],
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
          id: 'geo-labels-water-major',
          type: 'symbol',
          source: 'geo-labels',
          minzoom: 1.8,
          filter: ['all', ['==', ['get', 'kind'], 'water'], ['<=', ['get', 'minZoom'], 3.2]],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['atlas'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 5, 13],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': palette.geoWaterColor,
            'text-halo-color': palette.geoHalo,
            'text-halo-width': 1.2,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 2.0, 0.5, 3.2, 0.85],
          },
        },
        {
          id: 'geo-labels-water-minor',
          type: 'symbol',
          source: 'geo-labels',
          minzoom: 3.4,
          filter: ['all', ['==', ['get', 'kind'], 'water'], ['>', ['get', 'minZoom'], 3.2]],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['atlas'],
            'text-size': 11,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': palette.geoWaterColor,
            'text-halo-color': palette.geoHalo,
            'text-halo-width': 1.2,
            'text-opacity': 0.82,
          },
        },
        {
          id: 'geo-labels-land-major',
          type: 'symbol',
          source: 'geo-labels',
          minzoom: 2.3,
          filter: ['all', ['==', ['get', 'kind'], 'land'], ['<=', ['get', 'minZoom'], 3.2]],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['atlas'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 2.3, 10, 5, 12.5],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': palette.geoLandColor,
            'text-halo-color': palette.geoHalo,
            'text-halo-width': 1.2,
            'text-opacity': 0.8,
          },
        },
        {
          id: 'geo-labels-land-minor',
          type: 'symbol',
          source: 'geo-labels',
          minzoom: 3.5,
          filter: ['all', ['==', ['get', 'kind'], 'land'], ['>', ['get', 'minZoom'], 3.2]],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['atlas'],
            'text-size': 11,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
          },
          paint: {
            'text-color': palette.geoLandColor,
            'text-halo-color': palette.geoHalo,
            'text-halo-width': 1.2,
            'text-opacity': 0.78,
          },
        },
        {
          id: 'empire-labels',
          type: 'symbol',
          source: 'empire-labels',
          layout: {
            'text-field': ['get', 'zhName'],
            'text-font': ['atlas'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 10, 4, 13.5, 6, 15.5],
            'text-max-width': 8,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'symbol-sort-key': ['get', 'rank'],
          },
          paint: {
            'text-color': palette.labelColor,
            'text-halo-color': palette.labelHalo,
            'text-halo-width': 1.6,
            'text-opacity': [
              'step',
              ['zoom'],
              ['case', ['<=', ['get', 'rank'], 18], 0.85, 0],
              2.6,
              ['case', ['<=', ['get', 'rank'], 38], 0.88, 0],
              3.8,
              0.94,
            ],
          },
        },
        {
          id: 'historical-places-ring',
          type: 'circle',
          source: 'historical-places',
          minzoom: 2.5,
          filter: ['==', ['get', 'kind'], 'capital'],
          layout: {
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 2.5, 4.5, 5, 6.2],
            'circle-color': 'transparent',
            'circle-stroke-color': '#9E3434',
            'circle-stroke-width': 1.4,
            'circle-opacity': 0.9,
          },
        },
        {
          id: 'historical-places-dot',
          type: 'circle',
          source: 'historical-places',
          minzoom: 2.5,
          layout: {
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': [
              'match',
              ['get', 'kind'],
              'capital',
              2.8,
              'pass',
              2.6,
              2.2,
            ],
            'circle-color': [
              'match',
              ['get', 'kind'],
              'capital',
              '#B83B3B',
              'pass',
              '#8B5A3C',
              '#475569',
            ],
            'circle-stroke-color': '#FBF8F1',
            'circle-stroke-width': 1,
          },
        },
        {
          id: 'historical-places-capital-label',
          type: 'symbol',
          source: 'historical-places',
          minzoom: 2.7,
          filter: ['==', ['get', 'kind'], 'capital'],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['atlas'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 2.7, 10, 5.5, 12],
            'text-offset': [0, 1.0],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'text-color': palette.placeText,
            'text-halo-color': palette.placeHalo,
            'text-halo-width': 1.3,
          },
        },
        {
          id: 'historical-places-minor-label',
          type: 'symbol',
          source: 'historical-places',
          minzoom: 3.7,
          filter: ['!=', ['get', 'kind'], 'capital'],
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['atlas'],
            'text-size': 10.5,
            'text-offset': [0, 0.9],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            visibility: showLandmarksRef.current ? 'visible' : 'none',
          },
          paint: {
            'text-color': palette.geoLandColor,
            'text-halo-color': palette.placeHalo,
            'text-halo-width': 1.2,
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
        customAttribution: '疆域: historical-basemaps | 地形: Natural Earth & Esri',
      }),
      'bottom-left',
    );

    if (window.innerWidth >= 768) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    }

    let hoveredKey: string | null = null;

    map.on('load', () => {
      setMapReady(true);
    });
    if (map.loaded()) {
      setMapReady(true);
    }
    map.on('error', (e: { sourceId?: string; error?: unknown }) => {
      if (e?.sourceId === 'shaded-relief') return;
      console.error('[WorldMap] MapLibre error:', e.error || e);
    });
    map.on('move', () => {
      syncGlobeMarkerVisibility(map);
    });

    const handleEmpireMove = (buf: 'a' | 'b', e: maplibregl.MapLayerMouseEvent) => {
      if (activeBufferRef.current !== buf) return;
      if (pointerOverMarkerRef.current) return;
      if (!e.features || e.features.length === 0) return;
      const feat = e.features[0];
      const props = (feat.properties || {}) as { zhName?: string; enName?: string };
      const zhName = props.zhName || '未知政权';
      const key = `${buf}:${zhName}`;
      const inactiveHoverLayer = buf === 'a' ? 'empire-hover-b' : 'empire-hover-a';
      map.getCanvas().style.cursor = 'pointer';
      if (hoveredKey !== key) {
        hoveredKey = key;
        map.setFilter(`empire-hover-${buf}`, ['==', ['get', 'zhName'], zhName]);
        map.setFilter(inactiveHoverLayer, ['==', ['get', 'zhName'], '__none__']);
      }
      setHoveredPolity({
        zhName,
        enName: props.enName || '',
        x: e.point.x,
        y: e.point.y,
      });
    };

    const handleEmpireLeave = (buf: 'a' | 'b') => {
      if (activeBufferRef.current !== buf) return;
      map.getCanvas().style.cursor = '';
      hoveredKey = null;
      map.setFilter('empire-hover-a', ['==', ['get', 'zhName'], '__none__']);
      map.setFilter('empire-hover-b', ['==', ['get', 'zhName'], '__none__']);
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
          groupEnName?: string;
          fillColor?: string;
          isDiffuse?: boolean;
        };
        onSelectPolityRef.current?.({
          zhName: props.zhName || '未知政权',
          enName: props.enName || '',
          groupZhName: props.groupZhName || '',
          groupEnName: props.groupEnName || '',
          fillColor: props.fillColor || '#8A5D3B',
          isDiffuse: Boolean(props.isDiffuse),
          snapshotYear: snapshotYearRef.current,
          coords: [Number(e.lngLat.lng.toFixed(2)), Number(e.lngLat.lat.toFixed(2))],
        });
      } else if (!isCountryModeRef.current) {
        onDeselectRef.current?.();
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    mapRef.current = map;
    return () => {
      resizeObserver.disconnect();
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
    map.setPaintProperty(
      'shaded-relief-layer',
      'raster-opacity',
      showRelief ? (theme === 'obsidian' ? 0.24 : 0.62) : 0,
    );
    map.setPaintProperty('shaded-relief-layer', 'raster-contrast', theme === 'obsidian' ? 0.24 : 0.16);
    map.setPaintProperty(
      'shaded-relief-layer',
      'raster-saturation',
      theme === 'obsidian' ? -0.82 : -0.25,
    );
    map.setPaintProperty('shaded-relief-layer', 'raster-brightness-min', theme === 'obsidian' ? 0 : 0.08);
    map.setPaintProperty('shaded-relief-layer', 'raster-brightness-max', theme === 'obsidian' ? 0.42 : 1);
    map.setPaintProperty('graticule-lines', 'line-color', p.graticule);
    map.setPaintProperty('physical-land-fill', 'fill-color', p.land);
    map.setPaintProperty('physical-land-fill', 'fill-outline-color', p.landBorder);
    map.setPaintProperty(
      'physical-land-fill',
      'fill-opacity',
      showRelief ? (theme === 'obsidian' ? 0.62 : 0.42) : 1,
    );
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
    map.setPaintProperty(`empire-fills-${activeBuf}`, 'fill-opacity', p.empireFillOpacity);
    map.setPaintProperty(`empire-fills-${inactiveBuf}`, 'fill-opacity', 0);
    map.setPaintProperty('empire-hover-a', 'fill-color', p.empireHover);
    map.setPaintProperty('empire-hover-b', 'fill-color', p.empireHover);
    for (const layerId of [
      'empire-borders-solid-a',
      'empire-borders-dashed-a',
      'empire-borders-solid-b',
      'empire-borders-dashed-b',
    ]) {
      map.setPaintProperty(layerId, 'line-color', p.empireBorder);
    }
    map.setPaintProperty('empire-labels', 'text-color', p.labelColor);
    map.setPaintProperty('empire-labels', 'text-halo-color', p.labelHalo);
    map.setPaintProperty('geo-labels-water-major', 'text-color', p.geoWaterColor);
    map.setPaintProperty('geo-labels-water-major', 'text-halo-color', p.geoHalo);
    map.setPaintProperty('geo-labels-water-minor', 'text-color', p.geoWaterColor);
    map.setPaintProperty('geo-labels-water-minor', 'text-halo-color', p.geoHalo);
    map.setPaintProperty('geo-labels-land-major', 'text-color', p.geoLandColor);
    map.setPaintProperty('geo-labels-land-major', 'text-halo-color', p.geoHalo);
    map.setPaintProperty('geo-labels-land-minor', 'text-color', p.geoLandColor);
    map.setPaintProperty('geo-labels-land-minor', 'text-halo-color', p.geoHalo);
    map.setPaintProperty('historical-places-capital-label', 'text-color', p.placeText);
    map.setPaintProperty('historical-places-capital-label', 'text-halo-color', p.placeHalo);
    map.setPaintProperty('historical-places-minor-label', 'text-color', p.geoLandColor);
    map.setPaintProperty('historical-places-minor-label', 'text-halo-color', p.placeHalo);
  }, [theme, showRelief, mapReady]);

  // Synchronize landmark & mega-structure visibility and dynamic year sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (map.getSource('historical-places') as maplibregl.GeoJSONSource | undefined)?.setData(
      placesGeoJSON,
    );
    (map.getSource('mega-structures') as maplibregl.GeoJSONSource | undefined)?.setData(
      megaStructuresGeoJSON,
    );
  }, [placesGeoJSON, megaStructuresGeoJSON, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = showLandmarks ? 'visible' : 'none';
    for (const layerId of [
      'mega-structures-wall-casing',
      'mega-structures-wall',
      'mega-structures-canal',
      'historical-places-ring',
      'historical-places-dot',
      'historical-places-capital-label',
      'historical-places-minor-label',
    ]) {
      map.setLayoutProperty(layerId, 'visibility', vis);
    }
  }, [showLandmarks, mapReady]);

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
    map.setFilter('empire-hover-a', ['==', ['get', 'zhName'], '__none__']);
    map.setFilter('empire-hover-b', ['==', ['get', 'zhName'], '__none__']);
    setHoveredPolity(null);

    const palette = THEME_COLORS[themeRef.current];
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (lastSnapshotYearRef.current === null || lastSnapshotYearRef.current === snapshot.year || reducedMotion) {
      window.cancelAnimationFrame(crossfadeRafRef.current);
      const curBuf = activeBufferRef.current;
      const otherBuf = curBuf === 'a' ? 'b' : 'a';
      const hasFocus = Boolean(countryFocusRef.current);
      (map.getSource(`empires-${curBuf}`) as maplibregl.GeoJSONSource | undefined)?.setData(
        snapshot.polygons,
      );
      (map.getSource(`empires-${otherBuf}`) as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY_FC);
      map.setPaintProperty(`empire-fills-${curBuf}`, 'fill-opacity', palette.empireFillOpacity);
      map.setPaintProperty(`empire-border-glow-${curBuf}`, 'line-opacity', 0.34);
      map.setPaintProperty(`empire-borders-solid-${curBuf}`, 'line-opacity', 0.95);
      map.setPaintProperty(`empire-borders-dashed-${curBuf}`, 'line-opacity', 0.78);
      map.setPaintProperty(`empire-fills-${otherBuf}`, 'fill-opacity', 0);
      map.setPaintProperty(`empire-border-glow-${otherBuf}`, 'line-opacity', 0);
      map.setPaintProperty(`empire-borders-solid-${otherBuf}`, 'line-opacity', 0);
      map.setPaintProperty(`empire-borders-dashed-${otherBuf}`, 'line-opacity', 0);
      map.setPaintProperty(`empire-focus-fill-${curBuf}`, 'fill-opacity', hasFocus ? 0.18 : 0);
      map.setPaintProperty(`empire-focus-border-${curBuf}`, 'line-opacity', hasFocus ? 0.95 : 0);
      map.setPaintProperty(`empire-focus-fill-${otherBuf}`, 'fill-opacity', 0);
      map.setPaintProperty(`empire-focus-border-${otherBuf}`, 'line-opacity', 0);
      lastSnapshotYearRef.current = snapshot.year;
      return;
    }

    window.cancelAnimationFrame(crossfadeRafRef.current);
    const incomingBuf = activeBufferRef.current === 'a' ? 'b' : 'a';
    const outgoingBuf = activeBufferRef.current;
    activeBufferRef.current = incomingBuf;
    lastSnapshotYearRef.current = snapshot.year;

    map.setPaintProperty(`empire-fills-${incomingBuf}`, 'fill-opacity', 0);
    map.setPaintProperty(`empire-border-glow-${incomingBuf}`, 'line-opacity', 0);
    map.setPaintProperty(`empire-borders-solid-${incomingBuf}`, 'line-opacity', 0);
    map.setPaintProperty(`empire-borders-dashed-${incomingBuf}`, 'line-opacity', 0);
    map.setPaintProperty(`empire-focus-fill-${incomingBuf}`, 'fill-opacity', 0);
    map.setPaintProperty(`empire-focus-border-${incomingBuf}`, 'line-opacity', 0);
    (map.getSource(`empires-${incomingBuf}`) as maplibregl.GeoJSONSource | undefined)?.setData(
      snapshot.polygons,
    );

    let startTime: number | null = null;
    const duration = 480;

    const animateFade = (now: number) => {
      if (!mapRef.current) return;
      if (startTime === null) startTime = now;
      const rawT = clamp01((now - startTime) / duration);
      const eased = clamp01(1 - Math.pow(1 - rawT, 3));
      const outFactor = clamp01(1 - eased);
      const fillBase = THEME_COLORS[themeRef.current].empireFillOpacity;
      const inFill = clamp01(fillBase * eased);
      const outFill = clamp01(fillBase * outFactor);
      const hasFocus = Boolean(countryFocusRef.current);

      try {
        mapRef.current.setPaintProperty(`empire-fills-${incomingBuf}`, 'fill-opacity', inFill);
        mapRef.current.setPaintProperty(
          `empire-border-glow-${incomingBuf}`,
          'line-opacity',
          clamp01(0.34 * eased),
        );
        mapRef.current.setPaintProperty(
          `empire-borders-solid-${incomingBuf}`,
          'line-opacity',
          clamp01(0.95 * eased),
        );
        mapRef.current.setPaintProperty(
          `empire-borders-dashed-${incomingBuf}`,
          'line-opacity',
          clamp01(0.78 * eased),
        );
        mapRef.current.setPaintProperty(`empire-fills-${outgoingBuf}`, 'fill-opacity', outFill);
        mapRef.current.setPaintProperty(
          `empire-border-glow-${outgoingBuf}`,
          'line-opacity',
          clamp01(0.34 * outFactor),
        );
        mapRef.current.setPaintProperty(
          `empire-borders-solid-${outgoingBuf}`,
          'line-opacity',
          clamp01(0.95 * outFactor),
        );
        mapRef.current.setPaintProperty(
          `empire-borders-dashed-${outgoingBuf}`,
          'line-opacity',
          clamp01(0.78 * outFactor),
        );
        mapRef.current.setPaintProperty(
          `empire-focus-fill-${incomingBuf}`,
          'fill-opacity',
          hasFocus ? clamp01(0.18 * eased) : 0,
        );
        mapRef.current.setPaintProperty(
          `empire-focus-border-${incomingBuf}`,
          'line-opacity',
          hasFocus ? clamp01(0.95 * eased) : 0,
        );
        mapRef.current.setPaintProperty(
          `empire-focus-fill-${outgoingBuf}`,
          'fill-opacity',
          hasFocus ? clamp01(0.18 * outFactor) : 0,
        );
        mapRef.current.setPaintProperty(
          `empire-focus-border-${outgoingBuf}`,
          'line-opacity',
          hasFocus ? clamp01(0.95 * outFactor) : 0,
        );
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

  // Synchronize country highlight border & translucent fill overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const filter = buildCountryFocusFilter(countryFocus);
    const accent = countryFocus?.accentColor || '#D97706';
    const activeBuf = activeBufferRef.current;
    const otherBuf = activeBuf === 'a' ? 'b' : 'a';

    for (const buf of ['a', 'b'] as const) {
      map.setFilter(`empire-focus-fill-${buf}`, filter);
      map.setFilter(`empire-focus-border-${buf}`, filter);
      map.setPaintProperty(`empire-focus-fill-${buf}`, 'fill-color', accent);
      map.setPaintProperty(`empire-focus-border-${buf}`, 'line-color', accent);
    }

    map.setPaintProperty(`empire-focus-fill-${activeBuf}`, 'fill-opacity', countryFocus ? 0.18 : 0);
    map.setPaintProperty(`empire-focus-border-${activeBuf}`, 'line-opacity', countryFocus ? 0.95 : 0);
    map.setPaintProperty(`empire-focus-fill-${otherBuf}`, 'fill-opacity', 0);
    map.setPaintProperty(`empire-focus-border-${otherBuf}`, 'line-opacity', 0);
  }, [countryFocus, mapReady]);

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

  // Handle smooth camera easing when selecting an event, switching countries, or stepping storyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !flyTarget) return;
    const isDesktop = window.innerWidth >= 1024;
    const targetPitch = projectionRef.current === 'globe' ? 0 : (flyTarget.pitch ?? 0);
    const padding = isCountryModeRef.current
      ? isDesktop
        ? { top: 20, bottom: 84, left: 20, right: 20 }
        : { top: 14, bottom: 68, left: 14, right: 14 }
      : isDesktop
        ? { top: 28, bottom: 32, left: 24, right: 430 }
        : { top: 24, bottom: 220, left: 16, right: 16 };
    map.easeTo({
      center: flyTarget.center,
      zoom: flyTarget.exactZoom ? flyTarget.zoom : Math.max(map.getZoom(), flyTarget.zoom),
      pitch: targetPitch,
      duration: flyTarget.duration ?? 850,
      padding,
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

        btn.addEventListener('mouseenter', () => {
          pointerOverMarkerRef.current = true;
          setHoveredPolity(null);
        });
        btn.addEventListener('mouseleave', () => {
          pointerOverMarkerRef.current = false;
        });
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

        btn.addEventListener('mouseenter', () => {
          pointerOverMarkerRef.current = true;
          setHoveredPolity(null);
        });
        btn.addEventListener('mouseleave', () => {
          pointerOverMarkerRef.current = false;
        });
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
            top: Math.max(hoveredPolity.y - 44, 72),
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
          <div className="mt-0.5 text-[10px] font-medium" style={{ color: 'var(--accent-primary)' }}>
            点击查看国家历史演变 →
          </div>
        </div>
      )}
    </div>
  );
}
