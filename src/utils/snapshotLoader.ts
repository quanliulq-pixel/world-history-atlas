import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { getPolityDisplay, isDiffuseCulture, isIgnoredPolity } from '../data/polityNames';
import type { SnapshotLabel, SnapshotMeta } from '../types/history';

export interface PhysicalAtlasData {
  land: GeoJSON.FeatureCollection;
  lakes: GeoJSON.FeatureCollection;
  rivers: GeoJSON.FeatureCollection;
  relief: GeoJSON.FeatureCollection;
}

export interface DecodedSnapshot {
  year: number;
  polygons: GeoJSON.FeatureCollection;
  labels: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

type PhysicalBundleRaw = Record<'land' | 'lakes' | 'rivers' | 'relief', Topology>;

type SnapshotTopoRaw = Topology<{
  [key: string]: GeometryCollection<{ n?: string; p?: string; bp?: number }>;
}> & {
  labels?: SnapshotLabel[];
};

const snapshotCache = new Map<number, DecodedSnapshot>();
const inflightRequests = new Map<number, Promise<DecodedSnapshot>>();
let physicalCache: PhysicalAtlasData | null = null;
let manifestCache: SnapshotMeta[] | null = null;

function firstObjectCollection(topo: Topology): GeoJSON.FeatureCollection {
  const key = Object.keys(topo.objects)[0];
  return feature(topo, topo.objects[key] as GeometryCollection) as unknown as GeoJSON.FeatureCollection;
}

export async function loadManifest(): Promise<SnapshotMeta[]> {
  if (manifestCache) return manifestCache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/snapshots/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load snapshot manifest: HTTP ${res.status}`);
  const json = (await res.json()) as { snapshots: SnapshotMeta[] };
  manifestCache = json.snapshots;
  return manifestCache;
}

export async function loadPhysicalAtlas(): Promise<PhysicalAtlasData> {
  if (physicalCache) return physicalCache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/physical.topo.json`);
  if (!res.ok) throw new Error(`Failed to load physical atlas: HTTP ${res.status}`);
  const bundle = (await res.json()) as PhysicalBundleRaw;
  physicalCache = {
    land: firstObjectCollection(bundle.land),
    lakes: firstObjectCollection(bundle.lakes),
    rivers: firstObjectCollection(bundle.rivers),
    relief: firstObjectCollection(bundle.relief),
  };
  return physicalCache;
}

export async function loadSnapshot(meta: SnapshotMeta): Promise<DecodedSnapshot> {
  const cached = snapshotCache.get(meta.year);
  if (cached) return cached;

  const inflight = inflightRequests.get(meta.year);
  if (inflight) return inflight;

  const promise = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/snapshots/${meta.file}`);
    if (!res.ok) throw new Error(`Failed to load snapshot ${meta.file}: HTTP ${res.status}`);
    const topo = (await res.json()) as SnapshotTopoRaw;

    const rawGeo = firstObjectCollection(topo);
    const enrichedPolygons: GeoJSON.Feature[] = [];
    for (const f of rawGeo.features) {
      const props = (f.properties || {}) as { n?: string; p?: string; bp?: number };
      if (isIgnoredPolity(props.n) || isIgnoredPolity(props.p)) continue;
      const { zhName, enName, color, isDiffuse } = getPolityDisplay(props.n, props.p);
      const groupDisplay = props.p && props.p !== props.n ? getPolityDisplay(props.p, props.p) : null;
      enrichedPolygons.push({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          zhName,
          enName,
          groupZhName: groupDisplay?.zhName || zhName,
          groupEnName: props.p || enName,
          fillColor: isDiffuse ? 'rgba(201, 190, 166, 0.38)' : color,
          isDiffuse,
          bp: props.bp ?? 1,
        },
      });
    }

    const validLabels = (topo.labels || []).filter(
      (lbl) => !isIgnoredPolity(lbl.n) && !isIgnoredPolity(lbl.p),
    );
    const stateLabels = validLabels.filter((lbl) => !isDiffuseCulture(lbl.n, lbl.p));
    const diffuseLabels = validLabels.filter((lbl) => isDiffuseCulture(lbl.n, lbl.p));

    const labelFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [
      ...stateLabels.map((lbl, idx) => {
        const { zhName, enName } = getPolityDisplay(lbl.n, lbl.p);
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [lbl.lng, lbl.lat] },
          properties: { zhName, enName, rank: idx, area: lbl.a, isDiffuse: false },
        };
      }),
      ...diffuseLabels.map((lbl, idx) => {
        const { zhName, enName } = getPolityDisplay(lbl.n, lbl.p);
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [lbl.lng, lbl.lat] },
          properties: { zhName, enName, rank: 100 + idx, area: lbl.a, isDiffuse: true },
        };
      }),
    ];

    const decoded: DecodedSnapshot = {
      year: meta.year,
      polygons: {
        type: 'FeatureCollection',
        features: enrichedPolygons,
      },
      labels: {
        type: 'FeatureCollection',
        features: labelFeatures,
      },
    };

    if (snapshotCache.size >= 24) {
      const oldestKey = snapshotCache.keys().next().value;
      if (oldestKey !== undefined) snapshotCache.delete(oldestKey);
    }
    snapshotCache.set(meta.year, decoded);
    return decoded;
  })();

  inflightRequests.set(meta.year, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(meta.year);
  }
}

export function prefetchAdjacentSnapshots(currentMeta: SnapshotMeta, allSnapshots: SnapshotMeta[]) {
  const idx = allSnapshots.findIndex((s) => s.year === currentMeta.year);
  if (idx === -1) return;
  for (const offset of [-1, 1, 2]) {
    const target = allSnapshots[idx + offset];
    if (target && !snapshotCache.has(target.year) && !inflightRequests.has(target.year)) {
      void loadSnapshot(target).catch(() => {
        // Silent background prefetch
      });
    }
  }
}
