import { ERAS, MAX_YEAR, MIN_YEAR } from '../data/eras';
import type { Era, HistoricalFigure, HistoryEvent, SnapshotMeta } from '../types/history';

interface EraSegment {
  era: Era;
  startProgress: number;
  endProgress: number;
}

const SEGMENTS: EraSegment[] = (() => {
  let acc = 0;
  return ERAS.map((era, idx) => {
    const startProgress = acc;
    acc = idx === ERAS.length - 1 ? 1 : acc + era.weight;
    return {
      era,
      startProgress,
      endProgress: acc,
    };
  });
})();

export function yearToProgress(year: number): number {
  const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
  for (const seg of SEGMENTS) {
    if (clamped <= seg.era.endYear || seg === SEGMENTS[SEGMENTS.length - 1]) {
      const span = seg.era.endYear - seg.era.startYear;
      const ratio = span <= 0 ? 0 : (clamped - seg.era.startYear) / span;
      return seg.startProgress + ratio * (seg.endProgress - seg.startProgress);
    }
  }
  return 1;
}

export function progressToYear(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  for (const seg of SEGMENTS) {
    if (clamped <= seg.endProgress || seg === SEGMENTS[SEGMENTS.length - 1]) {
      const spanP = seg.endProgress - seg.startProgress;
      const ratio = spanP <= 0 ? 0 : (clamped - seg.startProgress) / spanP;
      return Math.round(seg.era.startYear + ratio * (seg.era.endYear - seg.era.startYear));
    }
  }
  return MAX_YEAR;
}

export function getEraSegments(): EraSegment[] {
  return SEGMENTS;
}

export function getEraForYear(year: number): Era {
  for (const era of ERAS) {
    if (year <= era.endYear) return era;
  }
  return ERAS[ERAS.length - 1];
}

export function formatYear(year: number): string {
  const rounded = Math.round(year);
  if (rounded < 0) return `公元前 ${Math.abs(rounded)} 年`;
  if (rounded === 0) return '公元前 1 年';
  return `公元 ${rounded} 年`;
}

export function formatShortYear(year: number): string {
  const rounded = Math.round(year);
  if (rounded < 0) return `BC ${Math.abs(rounded)}`;
  return `${rounded}`;
}

export function findNearestSnapshot(year: number, snapshots: SnapshotMeta[]): SnapshotMeta | null {
  if (snapshots.length === 0) return null;
  let chosen = snapshots[0];
  for (const snap of snapshots) {
    if (snap.year <= year) {
      chosen = snap;
    } else {
      break;
    }
  }
  return chosen;
}

export function getVisibilityWindow(year: number): number {
  if (year < -1000) return 520;
  if (year < 0) return 220;
  if (year < 1000) return 180;
  if (year < 1500) return 110;
  if (year < 1750) return 70;
  if (year < 1914) return 42;
  if (year < 1991) return 20;
  return 16;
}

export function isEventVisibleAtYear(
  event: HistoryEvent,
  currentYear: number,
  showAllEras: boolean,
): { visible: boolean; active: boolean; opacity: number } {
  const eventEnd = event.endYear ?? event.year;
  const isOngoing = currentYear >= event.year && currentYear <= eventEnd;
  const dist = isOngoing
    ? 0
    : Math.min(Math.abs(currentYear - event.year), Math.abs(currentYear - eventEnd));
  const window = getVisibilityWindow(currentYear);
  const active = isOngoing || dist <= window;

  if (showAllEras) {
    return {
      visible: true,
      active,
      opacity: active ? 1 : 0.36,
    };
  }

  if (!active) {
    return { visible: false, active: false, opacity: 0 };
  }

  const opacity = dist <= window * 0.45 ? 1 : Math.max(0.55, 1 - (dist - window * 0.45) / (window * 0.65));
  return { visible: true, active: true, opacity };
}

export function isFigureVisibleAtYear(
  figure: HistoricalFigure,
  currentYear: number,
  showAllEras: boolean,
): { visible: boolean; active: boolean; isAlive: boolean; opacity: number } {
  const death = figure.deathYear ?? MAX_YEAR;
  const isAlive = currentYear >= figure.birthYear && currentYear <= death;
  const dist = isAlive
    ? 0
    : Math.min(Math.abs(currentYear - figure.birthYear), Math.abs(currentYear - death));
  const win = Math.round(getVisibilityWindow(currentYear) * 0.65);
  const active = isAlive || dist <= win;

  if (showAllEras) {
    return {
      visible: true,
      active,
      isAlive,
      opacity: active ? 1 : 0.34,
    };
  }

  if (!active) {
    return { visible: false, active: false, isAlive: false, opacity: 0 };
  }

  const opacity = isAlive ? 1 : Math.max(0.58, 1 - dist / (win * 1.15));
  return { visible: true, active: true, isAlive, opacity };
}
