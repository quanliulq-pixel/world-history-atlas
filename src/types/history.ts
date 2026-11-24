export type Dimension = 'politics' | 'economy' | 'culture' | 'tech';

export type WorldRegion =
  | 'east-asia'
  | 'south-asia'
  | 'middle-east'
  | 'europe'
  | 'africa'
  | 'americas'
  | 'global';

export interface Era {
  id: string;
  name: string;
  shortName: string;
  startYear: number;
  endYear: number;
  weight: number;
  accentColor: string;
  overview: {
    geopolitics: string;
    economy: string;
    culture: string;
  };
}

export interface EventCardContent {
  summary: string;
  geography: string;
  politics: string;
  economy: string;
  culture: string;
  consequence: string;
  keyFigures?: string[];
  debate?: string;
}

export interface HistoryEvent {
  id: string;
  title: string;
  year: number;
  endYear?: number;
  dateDisplay: string;
  eraId: string;
  region: WorldRegion;
  locationName: string;
  coords: [number, number];
  primaryDimension: Dimension;
  dimensions: Dimension[];
  importance: 1 | 2 | 3;
  card: EventCardContent;
  causes?: string[];
  effects?: string[];
  routeIds?: string[];
  wikiUrl: string;
}

export interface HistoricalRoute {
  id: string;
  name: string;
  dimension: Dimension;
  startYear: number;
  endYear: number;
  description: string;
  waypoints: [number, number][];
  color: string;
  bidirectional?: boolean;
}

export interface StorylineStep {
  eventId: string;
  narrative: string;
  zoom?: number;
  center?: [number, number];
  highlightRouteIds?: string[];
}

export interface Storyline {
  id: string;
  title: string;
  subtitle: string;
  yearSpan: string;
  description: string;
  accentColor: string;
  steps: StorylineStep[];
}

export interface RegionalPulseItem {
  region: Exclude<WorldRegion, 'global'>;
  regionLabel: string;
  polity: string;
  politics: string;
  economy: string;
  culture: string;
  spotlightEventId?: string;
}

export interface WorldPulseSlice {
  id: string;
  year: number;
  yearLabel: string;
  headline: string;
  globalTheme: string;
  regions: RegionalPulseItem[];
}

export interface SnapshotMeta {
  year: number;
  file: string;
  polityCount: number;
}

export interface SnapshotLabel {
  n: string;
  p: string;
  lng: number;
  lat: number;
  a: number;
}

export interface UserStudyData {
  masteredIds: string[];
  bookmarkedIds: string[];
  notes: Record<string, string>;
}

export type ThemeMode = 'parchment' | 'obsidian';
export type ProjectionMode = 'mercator' | 'globe';

export type FigureRole = 'ruler' | 'thinker' | 'scientist' | 'reformer';

export interface FigureCardContent {
  oneLiner: string;
  eraContext: string;
  coreContributions: string;
  historicalImpact: string;
  controversy?: string;
  famousQuote?: string;
}

export interface HistoricalFigure {
  id: string;
  name: string;
  enName: string;
  aliases?: string[];
  title: string;
  birthYear: number;
  deathYear: number | null;
  lifespanDisplay: string;
  activeYear: number;
  eraId: string;
  region: WorldRegion;
  locationName: string;
  coords: [number, number];
  role: FigureRole;
  primaryDimension: Dimension;
  dimensions: Dimension[];
  importance: 1 | 2 | 3;
  monogram: string;
  relatedEventIds: string[];
  card: FigureCardContent;
  wikiUrl: string;
}
