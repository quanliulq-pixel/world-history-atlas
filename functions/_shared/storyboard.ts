export type AiStoryboardSpotIcon =
  | 'city'
  | 'landmark'
  | 'port'
  | 'trade'
  | 'military'
  | 'culture'
  | 'climate'
  | 'ruler';

export interface AiStoryboardZone {
  center: [number, number];
  radiusKm: number;
  label?: string;
  color: string;
}

export interface AiStoryboardSpot {
  coords: [number, number];
  label: string;
  sublabel?: string;
  color: string;
  icon?: AiStoryboardSpotIcon;
}

export interface AiStoryboardFlow {
  from: [number, number];
  to: [number, number];
  label: string;
  color: string;
  kind: 'trade' | 'diffusion' | 'military' | 'voyage' | 'influence';
  bidirectional?: boolean;
}

export interface AiStoryboardStep {
  title: string;
  caption: string;
  matchSnippet?: string;
  year: number;
  center: [number, number];
  zoom: number;
  bearing?: number;
  pitch?: number;
  zones?: AiStoryboardZone[];
  spots: AiStoryboardSpot[];
  flows: AiStoryboardFlow[];
}

export interface AiStoryboard {
  title: string;
  steps: AiStoryboardStep[];
}

export interface DocumentaryBeat {
  title: string;
  narration: string;
}

export interface DocumentaryPlan {
  script: string;
  beats: DocumentaryBeat[];
  storyboard: AiStoryboard;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_FLOW_KINDS = new Set(['trade', 'diffusion', 'military', 'voyage', 'influence']);
const ALLOWED_SPOT_ICONS = new Set<AiStoryboardSpotIcon>([
  'city',
  'landmark',
  'port',
  'trade',
  'military',
  'culture',
  'climate',
  'ruler',
]);

export function sanitizeCoords(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const lng = Number(raw[0]);
  const lat = Number(raw[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [
    Math.max(-180, Math.min(180, Number(lng.toFixed(3)))),
    Math.max(-78, Math.min(82, Number(lat.toFixed(3)))),
  ];
}

export function sanitizeHexColor(raw: unknown, fallback = '#D97706'): string {
  return typeof raw === 'string' && HEX_COLOR_RE.test(raw.trim()) ? raw.trim() : fallback;
}

function sanitizeZones(raw: unknown): AiStoryboardZone[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const zones: AiStoryboardZone[] = [];
  for (const rz of raw.slice(0, 2)) {
    if (!rz || typeof rz !== 'object') continue;
    const z = rz as Record<string, unknown>;
    const center = sanitizeCoords(z.center);
    if (!center) continue;
    const rawRad = Number(z.radiusKm);
    const radiusKm = Number.isFinite(rawRad) ? Math.max(60, Math.min(2200, Math.round(rawRad))) : 360;
    const label = typeof z.label === 'string' && z.label.trim() ? z.label.trim().slice(0, 18) : undefined;
    zones.push({
      center,
      radiusKm,
      label,
      color: sanitizeHexColor(z.color, '#D97706'),
    });
  }
  return zones.length > 0 ? zones : undefined;
}

function sanitizeSpots(raw: unknown): AiStoryboardSpot[] {
  if (!Array.isArray(raw)) return [];
  const spots: AiStoryboardSpot[] = [];
  for (const rs of raw.slice(0, 5)) {
    if (!rs || typeof rs !== 'object') continue;
    const sp = rs as Record<string, unknown>;
    const coords = sanitizeCoords(sp.coords);
    const label = typeof sp.label === 'string' ? sp.label.trim().slice(0, 24) : '';
    if (!coords || !label) continue;
    const iconRaw = typeof sp.icon === 'string' ? sp.icon.trim() : '';
    const icon = ALLOWED_SPOT_ICONS.has(iconRaw as AiStoryboardSpotIcon)
      ? (iconRaw as AiStoryboardSpotIcon)
      : undefined;
    spots.push({
      coords,
      label,
      sublabel:
        typeof sp.sublabel === 'string' && sp.sublabel.trim()
          ? sp.sublabel.trim().slice(0, 32)
          : undefined,
      color: sanitizeHexColor(sp.color, '#D97706'),
      icon,
    });
  }
  return spots;
}

function sanitizeFlows(raw: unknown): AiStoryboardFlow[] {
  if (!Array.isArray(raw)) return [];
  const flows: AiStoryboardFlow[] = [];
  for (const rf of raw.slice(0, 5)) {
    if (!rf || typeof rf !== 'object') continue;
    const fl = rf as Record<string, unknown>;
    const from = sanitizeCoords(fl.from);
    const to = sanitizeCoords(fl.to);
    const label = typeof fl.label === 'string' ? fl.label.trim().slice(0, 24) : '';
    if (!from || !to) continue;
    const kindRaw = typeof fl.kind === 'string' ? fl.kind.trim() : 'influence';
    const kind = (ALLOWED_FLOW_KINDS.has(kindRaw) ? kindRaw : 'influence') as AiStoryboardFlow['kind'];
    flows.push({
      from,
      to,
      label: label || '传播路径',
      color: sanitizeHexColor(fl.color, '#10B981'),
      kind,
      bidirectional: Boolean(fl.bidirectional),
    });
  }
  return flows;
}

function clampCamera(s: Record<string, unknown>) {
  const rawBearing = Number(s.bearing);
  const bearing = Number.isFinite(rawBearing)
    ? Math.max(-28, Math.min(28, Number(rawBearing.toFixed(1))))
    : 0;
  const rawPitch = Number(s.pitch);
  const pitch = Number.isFinite(rawPitch) ? Math.max(0, Math.min(36, Math.round(rawPitch))) : 20;
  return { bearing, pitch };
}

export function sanitizeStoryboard(raw: unknown, fallbackYear = 1492): AiStoryboard | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const rawSteps = Array.isArray(obj.steps) ? obj.steps.slice(0, 5) : [];
  const steps: AiStoryboardStep[] = [];

  for (const rawStep of rawSteps) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const s = rawStep as Record<string, unknown>;
    const title = typeof s.title === 'string' ? s.title.trim().slice(0, 40) : '';
    const caption = typeof s.caption === 'string' ? s.caption.trim().slice(0, 140) : '';
    const center = sanitizeCoords(s.center);
    if (!title || !center) continue;

    const rawYear = Number(s.year);
    const year = Number.isFinite(rawYear)
      ? Math.max(-3000, Math.min(2025, Math.round(rawYear)))
      : fallbackYear;
    const rawZoom = Number(s.zoom);
    const zoom = Number.isFinite(rawZoom) ? Math.max(1.2, Math.min(5.8, Number(rawZoom.toFixed(2)))) : 2.6;
    const { bearing, pitch } = clampCamera(s);

    steps.push({
      title,
      caption: caption || title,
      matchSnippet:
        typeof s.matchSnippet === 'string' && s.matchSnippet.trim()
          ? s.matchSnippet.trim().slice(0, 36)
          : undefined,
      year,
      center,
      zoom,
      bearing,
      pitch,
      zones: sanitizeZones(s.zones),
      spots: sanitizeSpots(s.spots),
      flows: sanitizeFlows(s.flows),
    });
  }

  if (steps.length === 0) return null;
  const title =
    typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim().slice(0, 40) : 'AI 历史演播分镜';
  return { title, steps };
}

export function sanitizeDocumentaryPlan(
  raw: unknown,
  fallbackTitle: string,
  fallbackYear: number,
  fallbackCoords?: [number, number],
): DocumentaryPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const rawBeats = Array.isArray(obj.beats) ? obj.beats.slice(0, 5) : [];
  const beats: DocumentaryBeat[] = [];
  const steps: AiStoryboardStep[] = [];

  for (const rb of rawBeats) {
    if (!rb || typeof rb !== 'object') continue;
    const b = rb as Record<string, unknown>;
    const title = typeof b.title === 'string' ? b.title.trim().slice(0, 28) : '';
    const narrationRaw = typeof b.narration === 'string' ? b.narration : '';
    const narration = narrationRaw
      .replace(/[*#`>\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 420);
    if (!narration) continue;

    const center = sanitizeCoords(b.center) || fallbackCoords || [35, 25];
    const rawYear = Number(b.year);
    const year = Number.isFinite(rawYear)
      ? Math.max(-3000, Math.min(2025, Math.round(rawYear)))
      : fallbackYear;
    const rawZoom = Number(b.zoom);
    const zoom = Number.isFinite(rawZoom) ? Math.max(1.2, Math.min(5.8, Number(rawZoom.toFixed(2)))) : 3.4;
    const { bearing, pitch } = clampCamera(b);
    const cleanTitle = title || `第 ${beats.length + 1} 幕`;

    beats.push({
      title: cleanTitle,
      narration,
    });
    steps.push({
      title: cleanTitle,
      caption: narration,
      matchSnippet: narration.slice(0, 18),
      year,
      center,
      zoom,
      bearing,
      pitch,
      zones: sanitizeZones(b.zones),
      spots: sanitizeSpots(b.spots),
      flows: sanitizeFlows(b.flows),
    });
  }

  if (beats.length === 0) return null;

  const sbTitle =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim().slice(0, 40)
      : fallbackTitle.slice(0, 40);

  return {
    script: beats.map((b) => b.narration).join(' '),
    beats,
    storyboard: {
      title: sbTitle,
      steps,
    },
  };
}

const ZONE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      center: { type: 'ARRAY', items: { type: 'NUMBER' } },
      radiusKm: { type: 'NUMBER' },
      label: { type: 'STRING' },
      color: { type: 'STRING' },
    },
    required: ['center', 'radiusKm', 'color'],
  },
};

const SPOTS_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      coords: { type: 'ARRAY', items: { type: 'NUMBER' } },
      label: { type: 'STRING' },
      sublabel: { type: 'STRING' },
      color: { type: 'STRING' },
      icon: { type: 'STRING' },
    },
    required: ['coords', 'label', 'color'],
  },
};

const FLOWS_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      from: { type: 'ARRAY', items: { type: 'NUMBER' } },
      to: { type: 'ARRAY', items: { type: 'NUMBER' } },
      label: { type: 'STRING' },
      color: { type: 'STRING' },
      kind: { type: 'STRING' },
      bidirectional: { type: 'BOOLEAN' },
    },
    required: ['from', 'to', 'label', 'color', 'kind'],
  },
};

export const STORYBOARD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          caption: { type: 'STRING' },
          matchSnippet: { type: 'STRING' },
          year: { type: 'INTEGER' },
          center: { type: 'ARRAY', items: { type: 'NUMBER' } },
          zoom: { type: 'NUMBER' },
          bearing: { type: 'NUMBER' },
          pitch: { type: 'NUMBER' },
          zones: ZONE_SCHEMA,
          spots: SPOTS_SCHEMA,
          flows: FLOWS_SCHEMA,
        },
        required: ['title', 'caption', 'matchSnippet', 'year', 'center', 'zoom', 'spots', 'flows'],
      },
    },
  },
  required: ['title', 'steps'],
};

export const DOCUMENTARY_NARRATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    beats: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          narration: { type: 'STRING' },
          year: { type: 'INTEGER' },
          center: { type: 'ARRAY', items: { type: 'NUMBER' } },
          zoom: { type: 'NUMBER' },
          bearing: { type: 'NUMBER' },
          pitch: { type: 'NUMBER' },
          zones: ZONE_SCHEMA,
          spots: SPOTS_SCHEMA,
          flows: FLOWS_SCHEMA,
        },
        required: ['title', 'narration', 'year', 'center', 'zoom', 'spots', 'flows'],
      },
    },
  },
  required: ['title', 'beats'],
};
