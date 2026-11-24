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
