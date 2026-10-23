import type { BlokCatalog } from "../renderer/runtime/functions";
import { preflightBlokDocument } from "../renderer/runtime/preflight";
import type { BlokComponentNode } from "../renderer/runtime/types";
import { NOT_GRAPHQL, readOnlyQueryProblem } from "@/core/ports/engine/constraints";
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

  for (const finding of checkReadOnlyQueries(tree)) {
    markers.push({ message: finding.message, range: rangeFor(sources, finding.nodeId, finding.propKey, whole), severity: "error" });
  }

  for (const finding of checkRecordWriters(tree, options.catalog)) {
    markers.push({ message: finding.message, range: rangeFor(sources, finding.nodeId, finding.propKey, whole), severity: "warning" });
  }

  return { tree, markers };
};

/**
 * A GraphQL document a blok carries (a `query` prop) only reads: a mutation or
 * subscription is marked, since the renderer refuses to send it. Text that is
 * not GraphQL (a search string) is left alone.
 */
export const checkReadOnlyQueries = (root: BlokComponentNode): { message: string; nodeId: string; propKey: string }[] => {
  const findings: { message: string; nodeId: string; propKey: string }[] = [];
  const visit = (node: BlokComponentNode) => {
    for (const prop of node.props ?? []) {
      if (prop.key !== "query" || typeof prop.static_value !== "string") continue;
      const problem = readOnlyQueryProblem(prop.static_value);
      if (problem && problem !== NOT_GRAPHQL) findings.push({ nodeId: node.id, propKey: prop.key, message: problem });
    }
    node.children?.forEach(visit);
  };
  visit(root);
  return findings;
};

/** A data-model path as written, normalized so `a/b` and `a.b` are one path. */
const pathKey = (path: string) => path.replace(/\//g, ".").replace(/^\.+|\.+$/g, "");

/**
 * One writer per record: a component that owns what it writes under a path
 * (`Query bind="cells"`) is the only node that may bind that path. A second
 * reader would race it; a control bound there would overwrite its answer.
 * Only literal binds are compared: a bind computed at render is not known here.
 */
export const checkRecordWriters = (
  root: BlokComponentNode,
  catalog: BlokCatalog,
): { message: string; nodeId: string; propKey: string }[] => {
  const binds: { node: BlokComponentNode; key: string; path: string; owner: boolean }[] = [];
  const visit = (node: BlokComponentNode) => {
    const ownKey = catalog.components.get(node.component)?.writesRecordTo;
    for (const prop of node.props ?? []) {
      if (typeof prop.static_value !== "string") continue;
      if (prop.key !== "bind" && prop.key !== ownKey) continue;
      binds.push({ node, key: prop.key, path: pathKey(prop.static_value), owner: prop.key === ownKey });
    }
    node.children?.forEach(visit);
  };
  visit(root);

  const findings: { message: string; nodeId: string; propKey: string }[] = [];
  const reported = new Set<(typeof binds)[number]>();
  for (const owner of binds.filter((bind) => bind.owner)) {
    for (const other of binds) {
      if (other === owner || other.path !== owner.path || reported.has(other)) continue;
      // Two owners on one path: reported once, on the later one.
      if (other.owner && binds.indexOf(other) < binds.indexOf(owner)) continue;
      reported.add(other);
      findings.push({
        nodeId: other.node.id,
        propKey: other.key,
        message: other.owner
          ? `<${owner.node.component}> '${owner.node.id}' already writes '${owner.path}': two readers would race. Bind this one elsewhere.`
          : `'${owner.path}' is written by <${owner.node.component}> '${owner.node.id}': a control bound here would overwrite its answer. Read it with @${owner.path} instead.`,
      });
    }
  }
  return findings;
};
