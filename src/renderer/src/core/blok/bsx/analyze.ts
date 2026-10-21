import type { BlokCatalog } from "../renderer/runtime/functions";
import { preflightBlokDocument } from "../renderer/runtime/preflight";
import type { BlokComponentNode } from "../renderer/runtime/types";
import { CONTEXT_ROOT, type BsxBlokContext } from "./catalogView";
import { parseBsxSafe, type BsxSourceMap } from "./parse";
import { checkBsxReferences, type BsxReferenceContext } from "./references";
import type { BsxRange } from "./source";

export type BsxMarker = { message: string; range: BsxRange; severity: "error" | "warning" };

export type BsxAnalysis = {
  /** Null when the text does not parse. */
  tree: BlokComponentNode | null;
  markers: BsxMarker[];
};

const PROP_PATH = /\.props\.([^.[\]]+)/;

const rangeFor = (sources: BsxSourceMap, nodeId: string | undefined, propKey: string | undefined, fallback: BsxRange): BsxRange => {
  const source = nodeId ? sources.get(nodeId) : undefined;
  if (!source) return fallback;
  const prop = propKey ? source.props.get(propKey) : undefined;
  if (prop) return prop.valueRange.end > prop.valueRange.start ? prop.valueRange : prop.nameRange;
  return source.tagRange;
};

/**
 * Everything the editor marks in a blok's source: where it does not parse;
 * else what the catalog refuses (`preflightBlokDocument`, the renderer's own
 * check), a root the blok's context does not take, and references that do
 * not resolve against what it declares.
 */
export const analyzeBsx = (
  source: string,
  options: { catalog: BlokCatalog; context: BsxBlokContext; references: BsxReferenceContext },
): BsxAnalysis => {
  const parsed = parseBsxSafe(source);
  if (!parsed.ok) return { tree: null, markers: [{ message: parsed.error.message, range: parsed.error.range, severity: "error" }] };

  const { tree, sources } = parsed;
  const whole = sources.get(tree.id)?.tagRange ?? { start: 0, end: 1 };
  const markers: BsxMarker[] = [];

  const root = CONTEXT_ROOT[options.context];
  if (root && tree.component !== root) {
    markers.push({ message: `A ${options.context} blok's root is <${root}>, not <${tree.component}>.`, range: whole, severity: "error" });
  }

  for (const error of preflightBlokDocument([tree], options.catalog).errors) {
    const propKey = PROP_PATH.exec(error.path)?.[1];
    markers.push({ message: error.message, range: rangeFor(sources, error.componentId, propKey, whole), severity: "error" });
  }

  for (const finding of checkBsxReferences(tree, options.references)) {
    markers.push({ message: finding.message, range: rangeFor(sources, finding.nodeId, finding.propKey, whole), severity: "error" });
  }

  return { tree, markers };
};
