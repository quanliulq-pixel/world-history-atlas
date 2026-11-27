export type Dimension = 'politics' | 'economy' | 'culture' | 'tech';

export type WorldRegion =
  | 'east-asia'
  | 'south-asia'
  | 'middle-east'
  | 'europe'
  | 'africa'
  | 'americas'
  | 'global';

export interface SubPeriod {
  id: string;
  eraId: string;
  name: string;
  startYear: number;
  endYear: number;
  themeSummary: string;
}

export interface Era {
  id: string;
  name: string;
  shortName: string;
  startYear: number;
  endYear: number;
  weight: number;
  accentColor: string;
  subPeriods: SubPeriod[];
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

export interface ClickedPolityPayload {
  zhName: string;
  enName: string;
  groupZhName: string;
  groupEnName: string;
  fillColor: string;
  isDiffuse: boolean;
  snapshotYear: number;
  coords: [number, number];
}

export interface CountryEvolutionStage {
  id: string;
  name: string;
  periodDisplay: string;
  startYear: number;
  endYear: number;
  snapshotYear: number;
  capital?: string;
  polityNames?: string[];
  summary: string;
  politics: string;
  economy: string;
  culture: string;
}

export interface CountryEvolutionProfile {
  id: string;
  name: string;
  enName: string;
  region: Exclude<WorldRegion, 'global'>;
  accentColor: string;
  modernCountryKey: string;
  coords: [number, number];
  zoom: number;
  tagline: string;
  matchEnNames: string[];
  matchEnPatterns?: string[];
  matchZhNames?: string[];
  bbox: [number, number, number, number];
  overview: {
    geography: string;
    politics: string;
    economy: string;
    culture: string;
  };
  stages: CountryEvolutionStage[];
  eventIds: string[];
  figureIds: string[];
}

export interface CountrySnapshotEntry {
  year: number;
  enName: string;
  groupEnName: string;
  zhName: string;
  area: number;
}

export interface ModernCountryIndexEntry {
  enName: string;
  zhName: string;
  center: [number, number];
  bbox: [number, number, number, number];
  timeline: CountrySnapshotEntry[];
}

export interface PolityIndexEntry {
  years: number[];
  peakYear: number;
  peakArea: number;
  center: [number, number];
  modernCountry: string | null;
}

export interface CountryEvolutionIndex {
  snapshotYears: number[];
  modernCountries: Record<string, ModernCountryIndexEntry>;
  polities: Record<string, PolityIndexEntry>;
}

export interface ResolvedCountryEvolution {
  id: string;
  name: string;
  enName: string;
  region: WorldRegion;
  accentColor: string;
  coords: [number, number];
  zoom: number;
  tagline: string;
  isCurated: boolean;
  clickedPolity: ClickedPolityPayload | null;
  localAlternative?: {
    modernCountryKey: string;
    zhName: string;
    enName: string;
    coords: [number, number];
  } | null;
  overview: {
    geography: string;
    politics: string;
    economy: string;
    culture: string;
  };
  stages: CountryEvolutionStage[];
  snapshotLedger: CountrySnapshotEntry[];
  highlightEnNames: string[];
  highlightZhNames: string[];
  events: HistoryEvent[];
  figures: HistoricalFigure[];
}

export type GlobalMacroRegionKey =
  | 'china'
  | 'india'
  | 'westernEurope'
  | 'usa'
  | 'japan'
  | 'russiaUssr'
  | 'middleEastNorthAfrica'
  | 'latinAmerica'
  | 'restOfWorld';

export interface GlobalEconBenchmark {
  year: number;
  label: string;
  worldPopulationM: number;
  worldGdpBillionPPP: number;
  worldGdpPerCapitaPPP: number;
  tradeOpennessPct: number;
  monetaryRegime: string;
  dominantEconomy: string;
  keyShift: string;
  gdpSharePct: Record<GlobalMacroRegionKey, number>;
  gdpPerCapitaPPP: {
    china: number;
    india: number;
    westernEurope: number;
    usa: number;
    japan: number;
    world: number;
  };
}

export interface FinancialCrisisRecord {
  id: string;
  year: number;
  yearDisplay: string;
  name: string;
  epicenter: string;
  region: WorldRegion;
  trigger: string;
  mechanism: string;
  peakImpact: string;
  policyResponse: string;
  institutionalLegacy: string;
  severity: 1 | 2 | 3;
  relatedEventId?: string;
  coords: [number, number];
}

export interface MonetaryRegimeEpoch {
  id: string;
  startYear: number;
  endYear: number;
  periodLabel: string;
  name: string;
  anchorAsset: string;
  coreCenter: string;
  settlementMechanism: string;
  strength: string;
  vulnerability: string;
  accentColor: string;
}

export interface CountryEconPoint {
  year: number;
  gdpSharePct: number;
  gdpPerCapitaPPP: number;
  populationM: number;
  note?: string;
}

export interface CountryEconomicProfile {
  countryId: string;
  structuralSignature: string;
  currencyHistory: string;
  fiscalEvolution: string;
  pillarIndustries: Array<{ era: string; sectors: string }>;
  turningPoints: Array<{ year: number; title: string; impact: string }>;
  series: CountryEconPoint[];
}

export type TechDomainKey = 'energy' | 'computing' | 'medicine' | 'transport' | 'science';

export interface TechProgressBenchmark {
  year: number;
  label: string;
  lifeExpectancyYears: number;
  globalLiteracyPct: number;
  energyPerCapitaKwhDay: number;
  maxTravelSpeedKmh: number;
  computeFlopsLog10: number;
  dominantEnergy: string;
  keyBreakthrough: string;
}

export interface TechRevolutionWave {
  id: string;
  startYear: number;
  endYear: number;
  periodLabel: string;
  name: string;
  coreEnergy: string;
  infoMedium: string;
  flagshipInventions: string;
  structuralShift: string;
  accentColor: string;
  relatedEventIds: string[];
}

export interface LiveIndicatorDatum {
  value: number;
  year: number;
}

export interface LiveCountryIndicators {
  countryId: string;
  iso3: string;
  isoNote?: string;
  rndPctGdp?: LiveIndicatorDatum;
  internetPct?: LiveIndicatorDatum;
  renewableEnergyPct?: LiveIndicatorDatum;
  highTechExportsPct?: LiveIndicatorDatum;
  gdpPerCapitaPPP?: LiveIndicatorDatum;
  population?: LiveIndicatorDatum;
}

export interface LiveIndicatorsPayload {
  source: string;
  fetchedAt: string;
  worldBankLastUpdated?: string;
  countries: Record<string, LiveCountryIndicators>;
}
