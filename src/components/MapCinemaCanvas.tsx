import type * as maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import { DIMENSION_META } from '../data/eras';
import type {
  Dimension,
  HistoryEvent,
  ProjectionMode,
  ThemeMode,
} from '../types/history';
import type { AiStoryboardFlow, AiStoryboardStep } from '../utils/aiClient';
import { samplePolylineAt } from '../utils/geo';
import type { VisualConceptKind } from '../utils/narrationFocus';

export interface MapCinemaRouteMeta {
  coords: [number, number][];
  cum: number[];
  color: string;
  focused: boolean;
  bidirectional: boolean;
  dimension: Dimension;
}

interface MapCinemaCanvasProps {
  map: maplibregl.Map | null;
  mapReady: boolean;
  theme: ThemeMode;
  projection: ProjectionMode;
  eraId: string;
  isPlaying: boolean;
  cinemaMode: boolean;
  selectedEvent: HistoryEvent | null;
  aiScene: AiStoryboardStep | null;
  aiFlowsMeta: Array<{
    id: string;
    flow: AiStoryboardFlow;
    coords: [number, number][];
    cum: number[];
  }>;
  routesMeta: MapCinemaRouteMeta[];
  focusedCountries?: Array<{ id?: string; label: string; coords: [number, number]; color: string }>;
  narrationConceptKind?: VisualConceptKind | null;
}

interface DustSeed {
  xFrac: number;
  yFrac: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

function createSeeds(count: number): DustSeed[] {
  const out: DustSeed[] = [];
  for (let i = 0; i < count; i++) {
    const s = (i * 9301 + 49297) % 233280;
    const r1 = s / 233280;
    const r2 = ((i * 4231 + 11213) % 233280) / 233280;
    const r3 = ((i * 7919 + 3011) % 233280) / 233280;
    out.push({
      xFrac: r1,
      yFrac: r2,
      vx: 0.008 + r3 * 0.018,
      vy: (r1 - 0.45) * 0.012,
      size: 1.2 + r2 * 2.2,
      phase: r3 * Math.PI * 2,
    });
  }
  return out;
}

function drawOrientedVectorEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  kind: AiStoryboardFlow['kind'],
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  if (kind === 'voyage') {
    // Water wake behind vessel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-14, -4.5);
    ctx.moveTo(-4, 0);
    ctx.lineTo(-14, 4.5);
    ctx.stroke();

    // Stylized sailing caravel pointing +X
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.quadraticCurveTo(2, -4.5, -6, -3);
    ctx.lineTo(-4, 3);
    ctx.quadraticCurveTo(2, 4.5, 8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Billowing white sail highlight
    ctx.fillStyle = '#FFFDF5';
    ctx.beginPath();
    ctx.moveTo(-1, -5.5);
    ctx.quadraticCurveTo(3.5, 0, -1, 5.5);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'military') {
    // Sharp advancing tactical chevron
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -5.5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'trade') {
    // Golden diamond trade crest
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(7.5, 0);
    ctx.lineTo(0, -4.8);
    ctx.lineTo(-6.5, 0);
    ctx.lineTo(0, 4.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Radiant 4-point star emblem
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(7.5, 0);
    ctx.lineTo(2, -2);
    ctx.lineTo(0, -6.5);
    ctx.lineTo(-2, -2);
    ctx.lineTo(-7.5, 0);
    ctx.lineTo(-2, 2);
    ctx.lineTo(0, 6.5);
    ctx.lineTo(2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function MapCinemaCanvas({
  map,
  mapReady,
  theme,
  projection,
  eraId,
  isPlaying,
  cinemaMode,
  selectedEvent,
  aiScene,
  aiFlowsMeta,
  routesMeta,
  focusedCountries = [],
  narrationConceptKind = null,
}: MapCinemaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seeds = useMemo(() => createSeeds(34), []);

  const stateRef = useRef({
    theme,
    projection,
    eraId,
    isPlaying,
    cinemaMode,
    selectedEvent,
    aiScene,
    aiFlowsMeta,
    routesMeta,
    focusedCountries,
    narrationConceptKind,
  });
  stateRef.current = {
    theme,
    projection,
    eraId,
    isPlaying,
    cinemaMode,
    selectedEvent,
    aiScene,
    aiFlowsMeta,
    routesMeta,
    focusedCountries,
    narrationConceptKind,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !mapReady) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth || 1;
    let height = canvas.clientHeight || 1;
    const syncSize = () => {
      const parent = canvas.parentElement;
      width = parent?.clientWidth || canvas.clientWidth || 1;
      height = parent?.clientHeight || canvas.clientHeight || 1;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const rad = Math.PI / 180;
    let rafId = 0;

    const projectPoint = (
      lngLat: [number, number],
      isGlobe: boolean,
      sinLat0: number,
      cosLat0: number,
      lng0: number,
    ): { x: number; y: number } | null => {
      if (isGlobe) {
        const lat1 = lngLat[1] * rad;
        const lng1 = lngLat[0] * rad;
        const cosAngle =
          sinLat0 * Math.sin(lat1) + cosLat0 * Math.cos(lat1) * Math.cos(lng1 - lng0);
        if (cosAngle < 0.14) return null;
      }
      try {
        const p = map.project(lngLat);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
        return { x: p.x, y: p.y };
      } catch {
        return null;
      }
    };

    const drawRibbonPath = (
      coords: [number, number][],
      cum: number[],
      headFrac: number,
      tailFrac: number,
      color: string,
      kind: AiStoryboardFlow['kind'],
      isGlobe: boolean,
      sinLat0: number,
      cosLat0: number,
      lng0: number,
      strong: boolean,
    ) => {
      const span = Math.max(0.02, headFrac - tailFrac);
      const samples = 14;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= samples; i++) {
        const f = tailFrac + (span * i) / samples;
        const lngLat = samplePolylineAt(coords, cum, f);
        const pt = projectPoint(lngLat, isGlobe, sinLat0, cosLat0, lng0);
        if (pt) pts.push(pt);
      }
      if (pts.length < 2) return;

      // Outer luminous bloom
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = strong ? 0.34 : 0.22;
      ctx.lineWidth = strong ? 9 : 6;
      ctx.stroke();

      // Bright incandescent comet tail core
      const head = pts[pts.length - 1];
      const tail = pts[0];
      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, '#FFFDF7');
      ctx.globalAlpha = strong ? 0.94 : 0.72;
      ctx.strokeStyle = grad;
      ctx.lineWidth = strong ? 3.2 : 2.1;
      ctx.stroke();

      // Trailing spark glints
      for (let s = 1; s <= 3; s++) {
        const spIdx = Math.max(0, Math.floor((pts.length - 1) * (1 - s * 0.24)));
        const sp = pts[spIdx];
        ctx.globalAlpha = Math.max(0.18, 0.75 - s * 0.2);
        ctx.fillStyle = '#FFFDF5';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, Math.max(1, (strong ? 2.2 : 1.5) - s * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const prev = pts[pts.length - 2];
      const angle = Math.atan2(head.y - prev.y, head.x - prev.x);
      drawOrientedVectorEmblem(ctx, head.x, head.y, angle, kind, color);
    };

    const drawFrame = (now: number) => {
      if (document.hidden) {
        rafId = window.requestAnimationFrame(drawFrame);
        return;
      }

      const st = stateRef.current;
      ctx.clearRect(0, 0, width, height);

      const isDark = st.theme === 'obsidian';
      const isGlobe = st.projection === 'globe';
      const center = isGlobe ? map.getCenter() : null;
      const lat0 = center ? center.lat * rad : 0;
      const lng0 = center ? center.lng * rad : 0;
      const sinLat0 = Math.sin(lat0);
      const cosLat0 = Math.cos(lat0);
      const sec = now * 0.001;

      const activeCinema = st.cinemaMode || st.isPlaying || Boolean(st.aiScene);

      // 1. Era-mood ambient motion (lightweight cartographic atmosphere during playback)
      if (activeCinema) {
        ctx.save();
        if (st.eraId === 'era-4' || st.eraId === 'era-5') {
          // Gentle oceanic trade-wind streamlines
          ctx.strokeStyle = isDark ? 'rgba(125, 211, 252, 0.12)' : 'rgba(41, 107, 158, 0.11)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([18, 22]);
          ctx.lineDashOffset = -(now * 0.032);
          for (let i = 0; i < 6; i++) {
            const yBase = height * (0.14 + i * 0.14) + Math.sin(sec * 0.4 + i) * 14;
            ctx.beginPath();
            ctx.moveTo(-20, yBase);
            ctx.bezierCurveTo(
              width * 0.32,
              yBase - 26,
              width * 0.68,
              yBase + 24,
              width + 20,
              yBase - 8,
            );
            ctx.stroke();
          }
        } else {
          const moteColor =
            st.eraId === 'era-6' || st.eraId === 'era-7'
              ? '#F97316'
              : st.eraId === 'era-8'
                ? '#38BDF8'
                : '#E5A94C';
          ctx.fillStyle = moteColor;
          for (const sd of seeds) {
            const x = (((sd.xFrac + sec * sd.vx * 0.35) % 1) + 1) % 1 * width;
            const y = (((sd.yFrac + sec * sd.vy * 0.35) % 1) + 1) % 1 * height;
            const twinkle = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(sec * 1.8 + sd.phase));
            ctx.globalAlpha = isDark ? twinkle * 1.15 : twinkle * 0.85;
            ctx.beginPath();
            ctx.arc(x, y, sd.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 1b. Focused Country Territory Spotlight Beacons & Corner Target Brackets
      if (st.focusedCountries.length > 0 && (activeCinema || st.selectedEvent)) {
        st.focusedCountries.forEach((fc, idx) => {
          const cpt = projectPoint(fc.coords, isGlobe, sinLat0, cosLat0, lng0);
          if (!cpt || cpt.x < -80 || cpt.x > width + 80 || cpt.y < -80 || cpt.y > height + 80) {
            return;
          }
          const pulse = 0.5 + 0.5 * Math.sin(sec * 2.6 + idx * 1.1);
          const boxR = 28 + pulse * 5;
          const arm = 9;
          ctx.save();
          ctx.translate(cpt.x, cpt.y);
          ctx.strokeStyle = fc.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.72;
          // 4 cartographic corner target brackets around the narrated country hub
          const corners: Array<[number, number, number, number]> = [
            [-1, -1, 1, 1],
            [1, -1, -1, 1],
            [1, 1, -1, -1],
            [-1, 1, 1, -1],
          ];
          for (const [cx, cy, dx, dy] of corners) {
            ctx.beginPath();
            ctx.moveTo(cx * boxR, cy * (boxR - arm));
            ctx.lineTo(cx * boxR, cy * boxR);
            ctx.lineTo(cx * (boxR - arm), cy * boxR);
            ctx.stroke();
            ctx.fillStyle = fc.color;
            ctx.globalAlpha = 0.25 + pulse * 0.25;
            ctx.fillRect(cx * boxR - (dx < 0 ? 2 : 0), cy * boxR - (dy < 0 ? 2 : 0), 2, 2);
            ctx.globalAlpha = 0.72;
          }

          // Pulsing territory beacon halo
          const haloR = 34 + ((sec * 22 + idx * 14) % 28);
          ctx.globalAlpha = Math.max(0, 0.34 * (1 - ((sec * 22 + idx * 14) % 28) / 28));
          ctx.beginPath();
          ctx.arc(0, 0, haloR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
      }

      // 2. Cartographic compass astrolabe & concept-tailored radar shockwave around epicenter
      const focalCoords =
        st.aiScene?.spots?.[0]?.coords ??
        st.aiScene?.center ??
        st.selectedEvent?.coords ??
        st.focusedCountries[0]?.coords ??
        null;
      const focalColor =
        st.aiScene?.spots?.[0]?.color ??
        st.focusedCountries[0]?.color ??
        (st.selectedEvent
          ? isDark
            ? DIMENSION_META[st.selectedEvent.primaryDimension].darkColor
            : DIMENSION_META[st.selectedEvent.primaryDimension].color
          : '#D97706');

      if (focalCoords) {
        const pt = projectPoint(focalCoords, isGlobe, sinLat0, cosLat0, lng0);
        if (pt && pt.x > -80 && pt.x < width + 80 && pt.y > -80 && pt.y < height + 80) {
          const intensity = activeCinema ? 1 : 0.62;
          ctx.save();

          // 3 staggered radar pulses
          for (let r = 0; r < 3; r++) {
            const p = (sec * 0.42 + r / 3) % 1;
            const radius = 16 + p * (activeCinema ? 74 : 52);
            ctx.globalAlpha = (1 - p) * (1 - p) * 0.46 * intensity;
            ctx.strokeStyle = focalColor;
            ctx.lineWidth = 2.0 - p * 1.1;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Rotating cartographic astrolabe bezel
          ctx.translate(pt.x, pt.y);
          const concept = st.narrationConceptKind;
          ctx.save();
          ctx.rotate(sec * (concept === 'tech' ? 0.55 : 0.22));
          const outerR = activeCinema ? 44 : 34;
          ctx.globalAlpha = 0.58 * intensity;
          ctx.strokeStyle = focalColor;
          ctx.lineWidth = concept === 'military' ? 1.5 : 1.15;
          ctx.setLineDash(concept === 'tech' ? [8, 4] : [5, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, outerR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.setLineDash([]);
          const tickCount = concept === 'military' ? 8 : concept === 'tech' ? 16 : 12;
          for (let t = 0; t < tickCount; t++) {
            const a = (t / tickCount) * Math.PI * 2;
            const inner = t % 3 === 0 ? outerR - 8 : outerR - 4;
            ctx.globalAlpha = (t % 3 === 0 ? 0.78 : 0.36) * intensity;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
            ctx.stroke();
          }
          ctx.restore();

          // Concept-specific orbiting visual accents
          if (concept === 'economy' && activeCinema) {
            for (let g = 0; g < 4; g++) {
              const a = sec * 0.9 + (g * Math.PI) / 2;
              ctx.globalAlpha = 0.82;
              ctx.fillStyle = '#F59E0B';
              ctx.beginPath();
              ctx.arc(Math.cos(a) * 34, Math.sin(a) * 34, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (concept === 'military' && activeCinema) {
            ctx.globalAlpha = 0.65;
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.4;
            for (let k = 0; k < 4; k++) {
              const a = (k * Math.PI) / 2 + Math.PI / 4;
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
              ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
              ctx.stroke();
            }
          } else {
            ctx.rotate(-sec * 0.45);
            ctx.globalAlpha = 0.42 * intensity;
            ctx.beginPath();
            ctx.arc(0, 0, outerR * 0.64, 0, Math.PI * 0.85);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, outerR * 0.64, Math.PI, Math.PI * 1.85);
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // 3. Tapered comet ribbons & oriented vessels/spearheads along active AI flows & historical routes
      const flowPhase = (sec * 0.28) % 1;
      for (let fIdx = 0; fIdx < st.aiFlowsMeta.length; fIdx++) {
        const meta = st.aiFlowsMeta[fIdx];
        if (meta.coords.length < 2) continue;
        for (let wave = 0; wave < 2; wave++) {
          const head = (flowPhase + wave * 0.5 + fIdx * 0.13) % 1;
          const tail = Math.max(0, head - 0.22);
          if (head > tail + 0.02) {
            drawRibbonPath(
              meta.coords,
              meta.cum,
              head,
              tail,
              meta.flow.color,
              meta.flow.kind,
              isGlobe,
              sinLat0,
              cosLat0,
              lng0,
              true,
            );
          }
          if (meta.flow.bidirectional) {
            const revTail = 1 - head;
            const revHead = Math.min(1, revTail + 0.22);
            if (revHead > revTail + 0.02) {
              // For reverse direction draw from revHead down to revTail by flipping indices smoothly
              const span = revHead - revTail;
              const pts: { x: number; y: number }[] = [];
              for (let i = 0; i <= 12; i++) {
                const frac = revHead - (span * i) / 12;
                const pt = projectPoint(
                  samplePolylineAt(meta.coords, meta.cum, frac),
                  isGlobe,
                  sinLat0,
                  cosLat0,
                  lng0,
                );
                if (pt) pts.push(pt);
              }
              if (pts.length >= 2) {
                const tailPt = pts[0];
                const headPt = pts[pts.length - 1];
                const prevPt = pts[pts.length - 2];
                ctx.save();
                ctx.lineCap = 'round';
                const grad = ctx.createLinearGradient(tailPt.x, tailPt.y, headPt.x, headPt.y);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(1, meta.flow.color);
                ctx.strokeStyle = grad;
                ctx.globalAlpha = 0.72;
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
                ctx.stroke();
                ctx.restore();
                drawOrientedVectorEmblem(
                  ctx,
                  headPt.x,
                  headPt.y,
                  Math.atan2(headPt.y - prevPt.y, headPt.x - prevPt.x),
                  meta.flow.kind,
                  meta.flow.color,
                );
              }
            }
          }
        }
      }

      const routePhase = (sec * 0.14) % 1;
      for (let rIdx = 0; rIdx < st.routesMeta.length; rIdx++) {
        const rm = st.routesMeta[rIdx];
        if (!rm.focused && !activeCinema) continue;
        if (rm.coords.length < 2) continue;
        const kind: AiStoryboardFlow['kind'] =
          rm.dimension === 'politics'
            ? 'military'
            : rm.dimension === 'economy'
              ? 'trade'
              : 'diffusion';
        const waveCount = rm.focused ? 3 : 1;
        for (let w = 0; w < waveCount; w++) {
          const head = (routePhase + w / waveCount + rIdx * 0.17) % 1;
          const tail = Math.max(0, head - 0.14);
          if (head > tail + 0.02) {
            drawRibbonPath(
              rm.coords,
              rm.cum,
              head,
              tail,
              rm.color,
              kind,
              isGlobe,
              sinLat0,
              cosLat0,
              lng0,
              rm.focused,
            );
          }
        }
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    rafId = window.requestAnimationFrame(drawFrame);
    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [map, mapReady, seeds]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden="true"
    />
  );
}
