/**
 * geometry.ts — symbol outlines and cached geometries.
 *
 * Every symbol is a beveled extruded plate, normalised at build time so its
 * bounding sphere has radius 1. That normalisation is what lets a star and a
 * hexagon carry the same visual weight, and lets the extras sit at fixed radii.
 *
 * Vendored from `@arkitekt/marks`; the shared layout constants moved to
 * `./constants` and the glyph table to `./spec`. `geometryFor` at the bottom is
 * the seam both renderers resolve a `MarkNode` through.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PLATE_BEVEL, PLATE_DEPTH } from "./constants";
import type { MarkNode } from "./markNodes";
import { GLYPHS, type Glyph } from "./spec";

const TAU = Math.PI * 2;

/* ---------------- outline builders ---------------- */

function roundedPoly(pts: [number, number][], r: number): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v1 = new THREE.Vector2(p0[0] - p1[0], p0[1] - p1[1]);
    const v2 = new THREE.Vector2(p2[0] - p1[0], p2[1] - p1[1]);
    const l1 = v1.length() || 1, l2 = v2.length() || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a: [number, number] = [p1[0] + (v1.x / l1) * rr, p1[1] + (v1.y / l1) * rr];
    const b: [number, number] = [p1[0] + (v2.x / l2) * rr, p1[1] + (v2.y / l2) * rr];
    if (i === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

const circle = <T extends THREE.Shape | THREE.Path>(p: T, cx: number, cy: number, r: number, ccw = false): T => {
  p.absarc(cx, cy, r, 0, TAU, ccw);
  return p;
};

function starPts(points: number, ro: number, ri: number): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro, a = (i / (points * 2)) * TAU - Math.PI / 2;
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
}

function regularPts(n: number, r: number, rot = 0): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot;
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
}

/** Superellipse: a friendlier square than a rounded box, and the fallback plate. */
function squircle(r: number, n = 4): THREE.Shape {
  const s = new THREE.Shape();
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * TAU, c = Math.cos(t), si = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * r;
    const y = Math.sign(si) * Math.pow(Math.abs(si), 2 / n) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

export const OUTLINES: Record<string, () => THREE.Shape> = {
  star: () => roundedPoly(starPts(5, 1.0, 0.45), 0.09),
  sphere: () => circle(new THREE.Shape(), 0, 0, 1.0),
  cube: () => roundedPoly([[-0.92, 0.92], [0.92, 0.92], [0.92, -0.92], [-0.92, -0.92]], 0.2),
  squircle: () => squircle(0.95, 4),
  hex: () => roundedPoly(regularPts(6, 1.0, Math.PI / 6), 0.14),
  diamond: () => roundedPoly([[0, 1.05], [0.78, 0], [0, -1.05], [-0.78, 0]], 0.13),
  cone: () => roundedPoly([[0, 1.02], [0.95, -0.72], [-0.95, -0.72]], 0.16),
  cross: () => {
    const a = 0.34, b = 1.0;
    return roundedPoly([[-a, b], [a, b], [a, a], [b, a], [b, -a], [a, -a],
      [a, -b], [-a, -b], [-a, -a], [-b, -a], [-b, a], [-a, a]], 0.12);
  },
  arrow: () => roundedPoly([[0, 1.05], [0.95, 0.05], [0.38, 0.05], [0.38, -1.02],
    [-0.38, -1.02], [-0.38, 0.05], [-0.95, 0.05]], 0.1),
  bolt: () => roundedPoly([[0.18, 1.05], [-0.72, 0.06], [-0.1, 0.06], [-0.28, -1.05],
    [0.72, -0.02], [0.08, -0.02]], 0.08),

  ring: () => {
    const s = circle(new THREE.Shape(), 0, 0, 1.0);
    s.holes.push(circle(new THREE.Path(), 0, 0, 0.63, true));
    return s;
  },
  moon: () => {
    const s = circle(new THREE.Shape(), 0, 0, 1.0);
    s.holes.push(circle(new THREE.Path(), 0.52, 0.16, 0.78, true));
    return s;
  },
  grid: () => {
    const s = squircle(0.98, 4);
    const d = 0.58, h = 0.2;
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const p = new THREE.Path();
      p.moveTo(sx * d - h, sy * d - h);
      p.lineTo(sx * d - h, sy * d + h);
      p.lineTo(sx * d + h, sy * d + h);
      p.lineTo(sx * d + h, sy * d - h);
      p.closePath();
      s.holes.push(p);
    }
    return s;
  },
  gear: () => {
    const teeth = 10, ro = 1.0, ri = 0.8;
    const pts: [number, number][] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const r = i % 2 === 0 ? ro : ri;
      const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU;
      pts.push([Math.cos(a0) * r, Math.sin(a0) * r]);
      pts.push([Math.cos(a1) * r, Math.sin(a1) * r]);
    }
    const s = roundedPoly(pts, 0.05);
    s.holes.push(circle(new THREE.Path(), 0, 0, 0.34, true));
    return s;
  },

  drop: () => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.08);
    s.quadraticCurveTo(0.88, 0.1, 0.74, -0.38);
    s.absarc(0, -0.38, 0.74, 0, -Math.PI, true);
    s.quadraticCurveTo(-0.88, 0.1, 0, 1.08);
    return s;
  },
  leaf: () => {
    const s = new THREE.Shape();
    s.moveTo(-0.78, -0.78);
    s.quadraticCurveTo(-0.9, 0.75, 0.78, 0.92);
    s.quadraticCurveTo(0.92, -0.72, -0.78, -0.78);
    return s;
  },
  lens: () => {
    const s = new THREE.Shape();
    s.moveTo(-1.02, 0);
    s.quadraticCurveTo(0, 1.08, 1.02, 0);
    s.quadraticCurveTo(0, -1.08, -1.02, 0);
    return s;
  },
  flame: () => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.1);
    s.quadraticCurveTo(0.86, 0.22, 0.66, -0.42);
    s.quadraticCurveTo(0.44, -1.06, -0.18, -1.02);
    s.quadraticCurveTo(0.3, -0.52, -0.16, -0.16);
    s.quadraticCurveTo(-0.76, 0.34, 0, 1.1);
    return s;
  },
  wave: () => {
    const s = new THREE.Shape();
    const N = 60, w = 1.0, amp = 0.3, band = 0.34;
    const y = (x: number, o: number) => Math.sin((x / w) * Math.PI * 1.5) * amp + o;
    s.moveTo(-w, y(-w, band));
    for (let i = 1; i <= N; i++) { const x = -w + (2 * w * i) / N; s.lineTo(x, y(x, band)); }
    s.lineTo(w, y(w, -band));
    for (let i = N - 1; i >= 0; i--) { const x = -w + (2 * w * i) / N; s.lineTo(x, y(x, -band)); }
    s.closePath();
    return s;
  },
  helix: () => {
    // an Archimedean ribbon: a spiral you can actually extrude
    const s = new THREE.Shape();
    const turns = 1.55, N = 130, w = 0.17;
    const R = (t: number) => 0.22 + t * 0.8;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * TAU * turns - Math.PI / 2, r = R(t) + w;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const t = i / N, a = t * TAU * turns - Math.PI / 2, r = Math.max(0.04, R(t) - w);
      s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
  },
  shield: () => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.05);
    s.quadraticCurveTo(0.86, 0.8, 0.86, 0.34);
    s.quadraticCurveTo(0.86, -0.62, 0, -1.08);
    s.quadraticCurveTo(-0.86, -0.62, -0.86, 0.34);
    s.quadraticCurveTo(-0.86, 0.8, 0, 1.05);
    return s;
  },
};

/* ---------------- extruded geometry, cached ---------------- */

const cache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = cache.get(key);
  if (!g) { g = make(); cache.set(key, g); }
  return g;
}

const PLATE = {
  depth: PLATE_DEPTH, bevelEnabled: true, bevelThickness: PLATE_BEVEL,
  bevelSize: PLATE_BEVEL, bevelSegments: 4, curveSegments: 22,
};

const _box = new THREE.Box3(), _sph = new THREE.Sphere();

/** Extruded symbol, centred and scaled so its bounding sphere has radius 1. */
export function plateGeometry(geom: string): THREE.BufferGeometry {
  return cached('plate:' + geom, () => {
    const build = OUTLINES[geom] ?? OUTLINES.squircle;
    const g = new THREE.ExtrudeGeometry(build(), PLATE);
    g.computeBoundingBox();
    _box.copy(g.boundingBox!);
    _box.getBoundingSphere(_sph);
    const k = 1 / (_sph.radius || 1);
    g.translate(-_sph.center.x, -_sph.center.y, -_sph.center.z);
    g.scale(k, k, k);
    g.computeVertexNormals();
    return g;
  });
}

/* ---------------- letters ---------------- */

const LETTER = {
  depth: 0.16, bevelEnabled: true, bevelThickness: 0.028,
  bevelSize: 0.028, bevelSegments: 3, curveSegments: 14,
};

/**
 * Cap height per outline, in plate units. A ring or a bolt has far less usable
 * centre than a hexagon, so one constant size either crowds the thin symbols or
 * wastes the fat ones. This is the table to tune if a letter crowds its symbol.
 */
export const CAP: Record<string, number> = {
  squircle: 0.86, sphere: 0.84, cube: 0.84, hex: 0.86, shield: 0.8,
  lens: 0.72, gear: 0.76, grid: 0.74, drop: 0.7, wave: 0.7,
  cross: 0.66, leaf: 0.56, diamond: 0.66, arrow: 0.64, cone: 0.62,
  moon: 0.62, flame: 0.62, star: 0.62, bolt: 0.54, ring: 0.52, helix: 0.56,
};
const CAP_DEFAULT = 0.8;

/** Extruded glyph, centred, sized for the symbol it will sit on. */
export function letterGeometry(ch: string, geom: string): THREE.BufferGeometry | null {
  const key = 'letter:' + ch + ':' + geom;
  const hit = cache.get(key);
  if (hit) return hit;

  const g: Glyph | undefined = GLYPHS.glyphs[ch];
  if (!g) return null;

  const path = new THREE.ShapePath();
  for (const contour of g.c) {
    for (const cmd of contour) {
      const [op, ...n] = cmd as [string, ...number[]];
      if (op === 'M') path.moveTo(n[0], n[1]);
      else if (op === 'L') path.lineTo(n[0], n[1]);
      else if (op === 'Q') path.quadraticCurveTo(n[0], n[1], n[2], n[3]);
      else if (op === 'C') path.bezierCurveTo(n[0], n[1], n[2], n[3], n[4], n[5]);
    }
  }
  const shapes = path.toShapes();
  if (!shapes.length) return null;

  const geo = new THREE.ExtrudeGeometry(shapes, LETTER);
  const k = (CAP[geom] ?? CAP_DEFAULT) / (GLYPHS.cap || 0.7);
  geo.scale(k, k, 1);
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
  cache.set(key, geo);
  return geo;
}

/* ---------------- extras ---------------- */

export const orbGeometry = () => cached('orb', () => new THREE.SphereGeometry(1, 28, 20));
export const cubeletGeometry = () => cached('cubelet', () => new RoundedBoxGeometry(1, 1, 1, 4, 0.18));
export const studGeometry = () => cached('stud', () => new THREE.CapsuleGeometry(0.5, 0.75, 6, 18));
export const spikeGeometry = () => cached('spike', () => new THREE.ConeGeometry(0.42, 1.0, 20));
export const orbitGeometry = () => cached('orbit', () => new THREE.TorusGeometry(1.2, 0.055, 20, 128));

/** Frees every cached geometry. Only needed if you tear the whole thing down. */
export function disposeGeometryCache() {
  cache.forEach((g) => g.dispose());
  cache.clear();
}

/** Resolve one `MarkNode` to its (cached, shared) geometry. */
export function geometryFor(node: MarkNode): THREE.BufferGeometry | null {
  switch (node.geom) {
    case "plate":
      return plateGeometry(node.plateGeom);
    case "letter":
      return node.letter ? letterGeometry(node.letter, node.plateGeom) : null;
    case "orb":
      return orbGeometry();
    case "cubelet":
      return cubeletGeometry();
    case "stud":
      return studGeometry();
    case "spike":
      return spikeGeometry();
    case "orbit":
      return orbitGeometry();
    default:
      return null;
  }
}
