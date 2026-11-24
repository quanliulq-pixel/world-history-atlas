import type { HistoricalFigure } from '../../types/history';
import { ANCIENT_FIGURES } from './ancient';
import { EARLY_MODERN_FIGURES } from './earlyModern';
import { MEDIEVAL_FIGURES } from './medieval';
import { MODERN_FIGURES } from './modern';

export const ALL_FIGURES: HistoricalFigure[] = [
  ...ANCIENT_FIGURES,
  ...MEDIEVAL_FIGURES,
  ...EARLY_MODERN_FIGURES,
  ...MODERN_FIGURES,
].sort((a, b) => a.activeYear - b.activeYear || a.birthYear - b.birthYear);

export const FIGURE_MAP: Record<string, HistoricalFigure> = Object.fromEntries(
  ALL_FIGURES.map((f) => [f.id, f]),
);

const FIGURE_NAME_LOOKUP: Record<string, HistoricalFigure> = (() => {
  const map: Record<string, HistoricalFigure> = {};
  for (const fig of ALL_FIGURES) {
    map[fig.name.trim().toLowerCase()] = fig;
    map[fig.enName.trim().toLowerCase()] = fig;
    for (const alias of fig.aliases || []) {
      map[alias.trim().toLowerCase()] = fig;
    }
  }
  return map;
})();

/**
 * Resolve an event keyFigure display string (e.g. "奥古斯都（屋大维）", "孔子")
 * to its full HistoricalFigure record if present in our curated figure library.
 */
export function findFigureByName(rawName: string): HistoricalFigure | undefined {
  const normalized = rawName.trim().toLowerCase();
  if (FIGURE_NAME_LOOKUP[normalized]) return FIGURE_NAME_LOOKUP[normalized];
  const withoutParens = rawName.replace(/\s*[（(][^）)]*[）)]\s*/g, '').trim().toLowerCase();
  if (withoutParens && FIGURE_NAME_LOOKUP[withoutParens]) {
    return FIGURE_NAME_LOOKUP[withoutParens];
  }
  return undefined;
}

/**
 * Find global historical figures whose lifetimes overlapped with `figure`,
 * prioritizing contemporaries from other world regions to highlight cross-civilizational synchronicity.
 */
export function getContemporaryFigures(
  figure: HistoricalFigure,
  limit = 6,
): HistoricalFigure[] {
  const figDeath = figure.deathYear ?? 2025;
  const candidates: { fig: HistoricalFigure; score: number }[] = [];

  for (const other of ALL_FIGURES) {
    if (other.id === figure.id) continue;
    const otherDeath = other.deathYear ?? 2025;
    const overlapStart = Math.max(figure.birthYear, other.birthYear);
    const overlapEnd = Math.min(figDeath, otherDeath);
    const overlapYears = overlapEnd - overlapStart;
    if (overlapYears < 5) continue;

    // Prioritize contemporaries from different regions, then higher importance and activeYear proximity
    const crossRegionBonus = other.region !== figure.region ? 1000 : 0;
    const importanceScore = other.importance * 120;
    const activeDistPenalty = Math.min(200, Math.abs(other.activeYear - figure.activeYear));
    candidates.push({
      fig: other,
      score: crossRegionBonus + importanceScore + Math.min(80, overlapYears) - activeDistPenalty,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit).map((item) => item.fig);
}
