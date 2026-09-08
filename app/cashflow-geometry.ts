export type Point = { x: number; y: number };
export type WaveCubic = {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
};
export type WaveSegment = { points: Point[]; path: string; cubics: WaveCubic[] };

/**
 * Build shape-preserving waves through the supplied daily coordinates.
 * Null means unknown, not zero, and always separates paths. Coordinates must be
 * finite and x must increase strictly within each known run. No points are added.
 */
export function buildWaveSegments(points: readonly (Point | null)[]): WaveSegment[] {
  const segments: WaveSegment[] = [];
  let run: Point[] = [];
  const flush = () => {
    if (run.length) segments.push(buildSegment(run));
    run = [];
  };
  for (const point of points) {
    if (point === null) { flush(); continue; }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new RangeError('Wave coordinates must be finite');
    }
    if (run.length && point.x <= run[run.length - 1].x) {
      throw new RangeError('Wave x coordinates must increase within each segment');
    }
    run.push({ x: point.x, y: point.y });
  }
  flush();
  return segments;
}

function buildSegment(points: Point[]): WaveSegment {
  const cubics: WaveCubic[] = [];
  let path = `M${points[0].x},${points[0].y}`;
  if (points.length === 1) return { points, path, cubics };

  const gaps = points.slice(1).map((point, index) => point.x - points[index].x);
  const slopes = points.slice(1).map((point, index) => {
    const slope = (point.y - points[index].y) / gaps[index];
    if (!Number.isFinite(gaps[index]) || !Number.isFinite(slope)) {
      throw new RangeError('Wave coordinate differences must be finite');
    }
    return slope;
  });
  // Weighted harmonic tangents handle unequal day-slot spacing. For equal gaps,
  // this is the harmonic mean used by the approved wave prototype.
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[index - 1], after = slopes[index];
    if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after)) return 0;
    const largestGap = Math.max(gaps[index - 1], gaps[index]);
    const beforeGap = gaps[index - 1] / largestGap;
    const afterGap = gaps[index] / largestGap;
    const beforeShare = beforeGap / (beforeGap + afterGap);
    const beforeWeight = 2 - beforeShare, afterWeight = 1 + beforeShare;
    const smaller = Math.abs(before) < Math.abs(after) ? before : after;
    return smaller * (3 / (beforeWeight * (smaller / before) + afterWeight * (smaller / after)));
  });

  // Fritsch–Carlson limiting keeps every cubic monotone between its anchors.
  // Limiting only reduces tangent magnitudes, preserving earlier intervals.
  slopes.forEach((slope, index) => {
    if (slope === 0) { tangents[index] = 0; tangents[index + 1] = 0; return; }
    const a = tangents[index] / slope, b = tangents[index + 1] / slope;
    const magnitude = Math.hypot(a, b);
    if (magnitude > 3) {
      tangents[index] *= 3 / magnitude;
      tangents[index + 1] *= 3 / magnitude;
    }
  });

  points.slice(1).forEach((end, index) => {
    const start = points[index], third = gaps[index] / 3;
    const control1 = { x: start.x + third, y: start.y + tangents[index] * third };
    const control2 = { x: end.x - third, y: end.y - tangents[index + 1] * third };
    cubics.push({ start, control1, control2, end });
    path += ` C${control1.x},${control1.y} ${control2.x},${control2.y} ${end.x},${end.y}`;
  });
  return { points, path, cubics };
}

function cubicY(cubic: WaveCubic, t: number): number {
  if (t <= 0) return cubic.start.y;
  if (t >= 1) return cubic.end.y;
  // De Casteljau evaluation avoids unnecessary high-order cancellation.
  const mix = (a: number, b: number) => a * (1 - t) + b * t;
  const a = mix(cubic.start.y, cubic.control1.y);
  const b = mix(cubic.control1.y, cubic.control2.y);
  const c = mix(cubic.control2.y, cubic.end.y);
  return mix(mix(a, b), mix(b, c));
}

/**
 * Exact centerline bounds across a label's horizontal footprint. Each cubic
 * produced above is monotone in y, while its evenly spaced x controls make x(t)
 * linear. Clipped interval endpoints therefore give its extrema without DOM
 * sampling. Stroke width and label padding remain the caller's responsibility.
 * Returns null outside this known segment or for non-finite query bounds.
 */
export function waveYBounds(segment: WaveSegment, fromX: number, toX: number): { min: number; max: number } | null {
  if (!Number.isFinite(fromX) || !Number.isFinite(toX) || !segment.points.length) return null;
  const first = segment.points[0], last = segment.points[segment.points.length - 1];
  const from = Math.max(first.x, Math.min(fromX, toX));
  const to = Math.min(last.x, Math.max(fromX, toX));
  if (from > to) return null;
  if (!segment.cubics.length) return { min: first.y, max: first.y };

  let min = Infinity, max = -Infinity;
  for (const cubic of segment.cubics) {
    const start = Math.max(from, cubic.start.x), end = Math.min(to, cubic.end.x);
    if (start > end) continue;
    const width = cubic.end.x - cubic.start.x;
    const a = cubicY(cubic, (start - cubic.start.x) / width);
    const b = cubicY(cubic, (end - cubic.start.x) / width);
    min = Math.min(min, a, b);
    max = Math.max(max, a, b);
  }
  return min === Infinity ? null : { min, max };
}
