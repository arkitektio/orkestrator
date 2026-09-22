/**
 * markParams.ts — pure: one embedding in, render parameters out.
 * No React, no three.js.
 *
 * The app is embedded ONCE, from `name. description`. Both channels read that
 * same vector: the nearest symbol word gives the core symbol, the nearest
 * semantic topic gives the colour, and the runner-up topic gives the extras.
 *
 * Vendored from `@arkitekt/marks`. The data tables moved to `./spec` and the
 * hash primitives to `./hash`, so the cache can be reached without them.
 */
import { cyrb53, mulberry32 } from "./hash";
import { SPEC, type ElementKind, type MarkSpec } from "./spec";

export type { ElementKind, MarkSpec };

export interface MarkInput {
  /** Display name. Only its first character is used, for the letter. */
  name: string;
  /** Stable id. Seeds pose, counts and the fallback plate — never the embedding. */
  identifier?: string;
  /**
   * Kabinet's `Embedding` scalar: `<model id>:<comma-separated floats>`, from
   * `App.embedding`. Null until the backend has indexed the app.
   *
   * Without one a mark is still stable and distinct, just not semantic: an
   * identifier-hashed plain plate in an identifier-hashed palette colour.
   */
  embedding?: string | null;
}

export interface MarkParams {
  specVersion: string;
  /** symbol channel */
  matched: boolean;
  geom: string;
  matchedShape: string | null;
  score: number;
  margin: number;
  /** every symbol's score, in spec order */
  shapeSims: number[];
  /** the five closest symbols, strongest first */
  top: { shape: string; score: number }[];
  /** topic channel */
  topic: string | null;
  topic2: string | null;
  topicScore: number;
  topicMargin: number;
  topicSims: number[];
  confidence: number;
  element: ElementKind;
  /** render */
  letter: string;
  baseColor: string;
  accentColor: string;
  ink: string;
  count: number;
  elementScale: number;
  yaw: number;
  roll: number;
}

/**
 * The string the offline fit embeds, kept here as the contract it is: change it
 * and every mark changes with it.
 *
 * Kabinet computes `App.embedding` itself, so this is not what the frontend
 * sends — it is what the anchors in `mark-spec.json` were fitted against. The
 * closer the backend's indexed text is to this shape, the more often a symbol
 * matches; the further away, the more apps fall back to a plain plate. Nothing
 * breaks either way.
 */
export function markText(name: string, description = ""): string {
  const n = name.replace(/[-_.]/g, " ").trim();
  return description ? `${n}. ${description}`.trim() : n;
}

/**
 * Model ids are compared leniently: the spec records the full hub id
 * (`minishlab/potion-base-8M`) while kabinet's own examples use the bare name
 * (`potion-base-8M`). The org prefix and the casing are noise; the model itself
 * is not.
 */
const sameModel = (a: string, b: string) => {
  const bare = (id: string) => id.split("/").pop()!.trim().toLowerCase();
  return bare(a) === bare(b);
};

/**
 * Decode kabinet's `Embedding` scalar: `<model id>:<comma-separated floats>`.
 *
 * The model id travels with the vector because vectors from different models
 * are not comparable — so a value from another model is rejected outright
 * rather than matched against anchors it shares no space with. A wrong symbol
 * asserted confidently is worse than the plain plate an app gets without one.
 *
 * Returns null for anything it cannot use, which simply means a hash-only mark.
 */
export function decodeEmbedding(
  value: string,
  dim: number,
  model?: string,
): Float32Array | null {
  const split = value.indexOf(":");
  if (split <= 0) return null;

  if (model && !sameModel(value.slice(0, split), model)) return null;

  const parts = value.slice(split + 1).split(",");
  if (parts.length !== dim) return null;

  const v = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    const x = Number(parts[i]);
    if (!Number.isFinite(x)) return null;
    v[i] = x;
  }
  return v;
}

/** Round before any discrete decision, so a last-bit float difference can't flip a symbol. */
const q = (x: number, step = 1 / 256) => Math.round(x / step) * step;

function best2(sims: number[]) {
  let a = -1;
  let b = -1;
  for (let i = 0; i < sims.length; i++) {
    if (a < 0 || sims[i] > sims[a]) {
      b = a;
      a = i;
    } else if (b < 0 || sims[i] > sims[b]) {
      b = i;
    }
  }
  return {
    top: a,
    second: b,
    score: a < 0 ? 0 : sims[a],
    margin: b < 0 ? 0 : sims[a] - sims[b],
  };
}

function initial(name: string): string {
  const m = String(name || "").match(/[A-Za-z0-9]/);
  return m ? m[0].toUpperCase() : "?";
}

export function markParams(input: MarkInput, spec: MarkSpec = SPEC): MarkParams {
  const D = spec.dim;
  const v = input.embedding ? decodeEmbedding(input.embedding, D, spec.model) : null;

  // Centre and normalise ONCE, then every anchor is a single dot product:
  // 26 anchors x 256 dims is about 7k multiply-adds for the whole mark.
  let c: Float32Array | null = null;
  if (v) {
    c = new Float32Array(D);
    let n = 0;
    for (let i = 0; i < D; i++) {
      const x = v[i] - spec.mean[i];
      c[i] = x;
      n += x * x;
    }
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < D; i++) c[i] /= n;
  }

  const sims = (anchors: { vec: number[] }[]) => {
    const centred = c;
    if (!centred) return anchors.map(() => 0);
    return anchors.map((a) => {
      const av = a.vec;
      let d = 0;
      for (let i = 0; i < D; i++) d += centred[i] * av[i];
      return q(d);
    });
  };

  const shapeSims = sims(spec.shapes);
  const s = best2(shapeSims);
  const matched =
    !!c && s.score >= spec.shapeMinSimilarity && s.margin >= spec.shapeMarginThreshold;

  const topicSims = sims(spec.topics);
  const t = best2(topicSims);
  const topicHit =
    !!c && t.score >= spec.topicMinSimilarity && t.margin >= spec.topicMarginThreshold;

  const tDef = topicHit ? spec.topics[t.top] : null;
  const t2Def = topicHit ? spec.topics[t.second] : null;
  const confidence = tDef ? Math.min(1, t.margin / 0.4) : 0;

  const rnd = mulberry32(cyrb53(input.identifier || input.name || ""));
  const r1 = rnd();
  const r2 = rnd();
  const r3 = rnd();
  const r4 = rnd();
  const r5 = rnd();

  // An unmatched app still gets a distinct mark, but only ever a PLAIN
  // geometric plate — the expressive symbols stay reserved for real matches.
  const plain = spec.fallbackGeoms;
  const fallback = plain[Math.floor(r1 * plain.length) % plain.length];

  return {
    specVersion: spec.version,

    matched,
    geom: matched ? spec.shapes[s.top].geom : fallback,
    matchedShape: s.top >= 0 ? spec.shapes[s.top].id : null,
    score: s.score,
    margin: s.margin,
    shapeSims,
    top: shapeSims
      .map((score, i) => ({ shape: spec.shapes[i].id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),

    topic: tDef ? tDef.id : null,
    topic2: t2Def ? t2Def.id : null,
    topicScore: t.score,
    topicMargin: t.margin,
    topicSims,
    confidence,
    // the extras come from the RUNNER-UP topic, so a mark shows two facets:
    // its colour says what it mostly is, its extras what it also touches
    element: (confidence >= 0.18 && t2Def ? t2Def.element : "none") as ElementKind,

    letter: initial(input.name),
    baseColor: tDef
      ? tDef.base
      : spec.palette[Math.floor(r4 * spec.palette.length) % spec.palette.length],
    accentColor: t2Def ? t2Def.accent : tDef ? tDef.accent : spec.ink,
    ink: spec.ink,

    count: 4 + Math.floor(r5 * 2),
    elementScale: 0.2 + 0.12 * confidence + 0.04 * r4,

    // pose stays in a narrow band: the letter has to stay readable
    yaw: (r2 - 0.5) * 0.3,
    roll: (r3 - 0.5) * 0.16,
  };
}

export { SPEC as markSpec, cyrb53, mulberry32 };
