import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWaveSegments, waveYBounds, type Point, type WaveCubic } from '../app/cashflow-geometry.ts';

const near = (actual: number, expected: number, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} must be within ${tolerance} of ${expected}`);
};
// Independent Bernstein evaluation checks the geometry actually serialized to SVG.
function sample(cubic: WaveCubic, t: number): Point {
  const u = 1 - t;
  const value = (axis: keyof Point) => u ** 3 * cubic.start[axis] + 3 * u ** 2 * t * cubic.control1[axis]
    + 3 * u * t ** 2 * cubic.control2[axis] + t ** 3 * cubic.end[axis];
  return { x: value('x'), y: value('y') };
}

test('unknown days split paths without bridging gaps or inventing singleton width', () => {
  const input = [null, { x: 0, y: 100 }, { x: 1, y: 90 }, null, null, { x: 5, y: 40 }, null,
    { x: 8, y: 100 }, { x: 9, y: 110 }, null];
  const original = structuredClone(input);
  const segments = buildWaveSegments(input);
  assert.deepEqual(segments.map((segment) => segment.points.length), [2, 1, 2]);
  assert.equal(segments[1].path, 'M5,40');
  assert.deepEqual(segments[1].cubics, []);
  assert.deepEqual(waveYBounds(segments[1], 5, 5), { min: 40, max: 40 });
  assert.equal(waveYBounds(segments[1], 5.001, 6), null);
  for (const segment of segments) assert.equal(waveYBounds(segment, 2, 4), null);
  assert.deepEqual(input, original);
  assert.deepEqual(buildWaveSegments([null, null]), []);
  assert.deepEqual(buildWaveSegments([]), []);
});

test('linear pairs produce exact SVG anchors and preserve the approved straight-line case', () => {
  const [segment] = buildWaveSegments([{ x: 0, y: 0 }, { x: 3, y: 3 }]);
  assert.equal(segment.path, 'M0,0 C1,1 2,2 3,3');
  const bounds = waveYBounds(segment, 0.25, 2.25)!;
  near(bounds.min, 0.25); near(bounds.max, 2.25);
});

test('flat zero and nonzero baselines stay flat without any minimum visible height', () => {
  for (const y of [0, 120]) {
    const [segment] = buildWaveSegments([{ x: 2, y }, { x: 11, y }, { x: 48, y }, { x: 50, y }]);
    for (const cubic of segment.cubics) {
      assert.equal(cubic.control1.y, y);
      assert.equal(cubic.control2.y, y);
      for (let step = 0; step <= 20; step += 1) near(sample(cubic, step / 20).y, y);
    }
    assert.deepEqual(waveYBounds(segment, -100, 100), { min: y, max: y });
  }
});

test('variable spacing, tiny values and sharp salary peaks never overshoot their surrounding anchors', () => {
  const cases: Point[][] = [
    [{ x: 0, y: 0 }, { x: 1, y: 0.0001 }, { x: 10, y: 1_000_000 }, { x: 10.01, y: 0 }, { x: 300, y: 3 }],
    [{ x: 0, y: 120 }, { x: 0.001, y: 119 }, { x: 200, y: 20 }, { x: 201, y: 119.9999 }, { x: 208, y: 120 }],
    [{ x: -30, y: -4 }, { x: -15, y: -4 }, { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 80, y: -10 }],
  ];
  // Deterministic varied runs exercise transitions, local extrema and unequal gaps.
  let seed = 47;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let run = 0; run < 40; run += 1) {
    let x = 0;
    cases.push(Array.from({ length: 12 }, () => {
      x += 0.1 + random() ** 2 * 300;
      return { x, y: random() < 0.2 ? 0 : random() ** 4 * 200 };
    }));
  }
  for (const points of cases) {
    const [segment] = buildWaveSegments(points);
    assert.equal(segment.cubics.length, points.length - 1);
    for (const [index, cubic] of segment.cubics.entries()) {
      assert.deepEqual(cubic.start, points[index]);
      assert.deepEqual(cubic.end, points[index + 1]);
      const low = Math.min(cubic.start.y, cubic.end.y), high = Math.max(cubic.start.y, cubic.end.y);
      const tolerance = Math.max(1, Math.abs(low), Math.abs(high)) * 1e-12;
      const direction = Math.sign(cubic.end.y - cubic.start.y);
      let previous = cubic.start.y;
      for (let step = 0; step <= 200; step += 1) {
        const point = sample(cubic, step / 200);
        assert.ok(point.y >= low - tolerance && point.y <= high + tolerance, `Overshoot: ${JSON.stringify({ cubic, point })}`);
        assert.ok(direction * (point.y - previous) >= -tolerance, 'Each individual cubic must remain monotone');
        near(point.x, cubic.start.x + (cubic.end.x - cubic.start.x) * step / 200, 1e-9);
        previous = point.y;
      }
    }
  }
});

test('label bounds clip to the label footprint and include an enclosed peak exactly', () => {
  const [segment] = buildWaveSegments([{ x: 0, y: 0 }, { x: 10, y: 100 }, { x: 20, y: 0 }]);
  const left = waveYBounds(segment, 0, 5)!;
  near(left.min, 0); near(left.max, 62.5);
  const peak = waveYBounds(segment, 5, 15)!;
  near(peak.min, 62.5); near(peak.max, 100);
  const point = waveYBounds(segment, 5, 5)!;
  near(point.min, 62.5); near(point.max, 62.5);
  assert.deepEqual(waveYBounds(segment, 15, 5), peak);
  assert.deepEqual(waveYBounds(segment, -100, 100), { min: 0, max: 100 });
  assert.equal(waveYBounds(segment, -10, -0.001), null);
  assert.equal(waveYBounds(segment, 20.001, 50), null);
  assert.equal(waveYBounds(segment, NaN, 10), null);
});

test('bounds agree with sampled visible curves across unequal intervals', () => {
  const [segment] = buildWaveSegments([{ x: 0, y: 120 }, { x: 2, y: 15 }, { x: 33, y: 100 }, { x: 40, y: 180 }, { x: 120, y: 120 }]);
  for (const [from, to] of [[1, 35], [2.5, 39.5], [0, 0.1], [41, 119], [32, 34]]) {
    const bounds = waveYBounds(segment, from, to)!;
    let observedMin = Infinity, observedMax = -Infinity;
    for (const cubic of segment.cubics) {
      const left = Math.max(from, cubic.start.x), right = Math.min(to, cubic.end.x);
      if (left > right) continue;
      for (let step = 0; step <= 100; step += 1) {
        const x = left + (right - left) * step / 100;
        const point = sample(cubic, (x - cubic.start.x) / (cubic.end.x - cubic.start.x));
        observedMin = Math.min(observedMin, point.y);
        observedMax = Math.max(observedMax, point.y);
      }
    }
    near(bounds.min, observedMin); near(bounds.max, observedMax);
  }
});

test('mirroring around a common zero preserves independent magnitude geometry', () => {
  const amounts = [0, 1.5, 0.7, 0, 0.00001], baseline = 120;
  const [upper] = buildWaveSegments(amounts.map((amount, x) => ({ x, y: baseline - amount * 60 })));
  const [lower] = buildWaveSegments(amounts.map((amount, x) => ({ x, y: baseline + amount * 60 })));
  for (let index = 0; index < upper.cubics.length; index += 1) {
    for (const field of ['start', 'control1', 'control2', 'end'] as const) near(upper.cubics[index][field].y + lower.cubics[index][field].y, baseline * 2);
  }
  const above = waveYBounds(upper, 0.5, 2.7)!, below = waveYBounds(lower, 0.5, 2.7)!;
  near(above.min + below.max, baseline * 2); near(above.max + below.min, baseline * 2);
});

test('invalid coordinates fail explicitly rather than producing distorted or non-finite SVG paths', () => {
  for (const points of [
    [{ x: 0, y: NaN }], [{ x: Infinity, y: 0 }],
    [{ x: 1, y: 1 }, { x: 1, y: 2 }], [{ x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: -1e308 }, { x: 1, y: 1e308 }],
  ]) assert.throws(() => buildWaveSegments(points), RangeError);
});
