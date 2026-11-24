/**
 * Unwrap route waypoints across the 180° antimeridian so trans-Pacific routes
 * (such as Manila Galleons or modern trans-Pacific supply chains) render across
 * the Pacific Ocean rather than jumping backward across Eurasia.
 */
export function unwrapRouteCoordinates(coords: [number, number][]): [number, number][] {
  if (coords.length === 0) return [];
  const result: [number, number][] = [[coords[0][0], coords[0][1]]];
  for (let i = 1; i < coords.length; i++) {
    const prevLng = result[i - 1][0];
    let lng = coords[i][0];
    const lat = coords[i][1];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    result.push([lng, lat]);
  }
  return result;
}

/**
 * Densifies a multi-waypoint route with smooth quadratic curve control points
 * so historical maritime and overland paths look organic and cartographic.
 */
export function buildSmoothRouteLine(waypoints: [number, number][], stepsPerSegment = 14): [number, number][] {
  const unwrapped = unwrapRouteCoordinates(waypoints);
  if (unwrapped.length < 2) return unwrapped;
  const dense: [number, number][] = [];

  for (let i = 0; i < unwrapped.length - 1; i++) {
    const [x1, y1] = unwrapped[i];
    const [x2, y2] = unwrapped[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const arcLift = Math.min(8, dist * 0.12);
    // Gentle perpendicular bulge northward/eastward for visual arc clarity
    const nx = dist > 0 ? -dy / dist : 0;
    const ny = dist > 0 ? dx / dist : 0;
    const sign = i % 2 === 0 ? 1 : -0.6;
    const cx = (x1 + x2) / 2 + nx * arcLift * sign;
    const cy = Math.max(-78, Math.min(78, (y1 + y2) / 2 + ny * arcLift * sign));

    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const omt = 1 - t;
      const lng = omt * omt * x1 + 2 * omt * t * cx + t * t * x2;
      const lat = omt * omt * y1 + 2 * omt * t * cy + t * t * y2;
      dense.push([lng, lat]);
    }
  }
  dense.push(unwrapped[unwrapped.length - 1]);
  return dense;
}

/**
 * Generates a curved directional causal arc between two event coordinates,
 * respecting the shortest path across the antimeridian.
 */
export function buildCausalArc(
  from: [number, number],
  to: [number, number],
  steps = 28,
): [number, number][] {
  const [x1, y1] = from;
  let [x2, y2] = to;
  while (x2 - x1 > 180) x2 -= 360;
  while (x2 - x1 < -180) x2 += 360;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.2) return [from, [x2, y2]];

  const lift = Math.min(18, Math.max(2.5, dist * 0.24));
  const nx = -dy / dist;
  const ny = dx / dist;
  // Bias arc curvature upward in screen space where helpful
  const sign = ny >= 0 ? 1 : -1;
  const cx = (x1 + x2) / 2 + nx * lift * sign;
  const cy = Math.max(-80, Math.min(80, (y1 + y2) / 2 + ny * lift * sign));

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    points.push([
      omt * omt * x1 + 2 * omt * t * cx + t * t * x2,
      omt * omt * y1 + 2 * omt * t * cy + t * t * y2,
    ]);
  }
  return points;
}

/**
 * Generates a 30-degree cartographic graticule FeatureCollection.
 */
export function buildGraticuleGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const coords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 10) {
      coords.push([lng, lat]);
    }
    features.push({
      type: 'Feature',
      properties: { kind: lat === 0 ? 'equator' : 'parallel' },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  for (let lng = -150; lng <= 180; lng += 30) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 10) {
      coords.push([lng, lat]);
    }
    features.push({
      type: 'Feature',
      properties: { kind: lng === 0 ? 'prime' : 'meridian' },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Computes cumulative 2D coordinate length along a polyline for particle and draw-in interpolation.
 */
export function computePolylineLengths(coords: [number, number][]): number[] {
  if (coords.length === 0) return [];
  const cum: number[] = [0];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    cum.push(total);
  }
  return cum;
}

/**
 * Samples a single [lng, lat] point at `fraction` ∈ [0, 1] along a polyline.
 */
export function samplePolylineAt(
  coords: [number, number][],
  cumLengths: number[],
  fraction: number,
): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1 || cumLengths.length !== coords.length) return coords[0];
  const total = cumLengths[cumLengths.length - 1];
  if (total <= 1e-9) return coords[0];

  const f = Math.max(0, Math.min(1, fraction));
  const target = f * total;
  let lo = 0;
  let hi = cumLengths.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (cumLengths[mid] <= target) lo = mid;
    else hi = mid;
  }
  const segLen = Math.max(1e-9, cumLengths[hi] - cumLengths[lo]);
  const ratio = Math.max(0, Math.min(1, (target - cumLengths[lo]) / segLen));
  return [
    coords[lo][0] + (coords[hi][0] - coords[lo][0]) * ratio,
    coords[lo][1] + (coords[hi][1] - coords[lo][1]) * ratio,
  ];
}

/**
 * Returns the revealed prefix of a polyline up to `fraction` ∈ [0, 1] for progressive route animations.
 */
export function slicePolylineByFraction(
  coords: [number, number][],
  cumLengths: number[],
  fraction: number,
): [number, number][] {
  if (coords.length < 2) return coords;
  const f = Math.max(0, Math.min(1, fraction));
  if (f >= 0.999) return coords;
  if (f <= 0.001) return [coords[0], coords[0]];

  const total = cumLengths[cumLengths.length - 1];
  const target = f * total;
  const sliced: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    if (cumLengths[i] <= target) {
      sliced.push(coords[i]);
    } else {
      const segLen = Math.max(1e-9, cumLengths[i] - cumLengths[i - 1]);
      const ratio = Math.max(0, Math.min(1, (target - cumLengths[i - 1]) / segLen));
      sliced.push([
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * ratio,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * ratio,
      ]);
      break;
    }
  }
  return sliced.length >= 2 ? sliced : [coords[0], coords[0]];
}
