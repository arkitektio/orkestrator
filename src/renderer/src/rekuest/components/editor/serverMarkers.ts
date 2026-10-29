import { offsetAtCodePoint, parseBsxSafe, type BsxMarker, type BsxRange } from "@arkitektio/bsx/bsx/index";
import { describeError } from "@/core/notify";

/**
 * What the server said about a draft, placed in its source: a refused save or
 * dry run (a GraphQL error, which names "line X, column Y" when BSX did not
 * parse), and the non-fatal findings of an edit (`Diagnostic`, whose `path`
 * names a node, a prop, or nothing the editor can find). Both carry the
 * vocabulary's codes, and the server counts columns in code points.
 */

export type ServerDiagnostic = { code: string; message: string; path?: string | null };

const NODE_PROP = /^(.*?)(?:[./]props[./]([^./[\]]+))?$/;

const rootRange = (source: string): BsxRange => {
  const start = Math.max(0, source.indexOf("<") + 1);
  const name = /^[A-Za-z_][\w:.\-]*/.exec(source.slice(start))?.[0] ?? "";
  return { start, end: start + Math.max(1, name.length) };
};

/** A diagnostic's path → where it is: a node by id (its prop when named), else the root tag. */
export const rangeForServerPath = (source: string, path: string | null | undefined): BsxRange => {
  const fallback = rootRange(source);
  if (!path) return fallback;
  const parsed = parseBsxSafe(source);
  if (!parsed.ok) return fallback;
  const [, nodeId, propKey] = NODE_PROP.exec(path) ?? [];
  const node = parsed.sources.get(path) ?? (nodeId ? parsed.sources.get(nodeId) : undefined);
  if (!node) {
    // A path that is only a prop key, on the root.
    const prop = parsed.sources.get(parsed.tree.id)?.props.get(path);
    return prop?.valueRange ?? fallback;
  }
  const prop = propKey ? node.props.get(propKey) : undefined;
  return prop ? (prop.valueRange.end > prop.valueRange.start ? prop.valueRange : prop.nameRange) : node.tagRange;
};

export const diagnosticMarkers = (diagnostics: readonly ServerDiagnostic[], source: string): BsxMarker[] =>
  diagnostics.map((diagnostic) => ({
    message: `${diagnostic.message} (${diagnostic.code})`,
    range: rangeForServerPath(source, diagnostic.path),
    severity: "warning",
    code: diagnostic.code,
  }));

/** The server refused the draft: the reason, at the line it names, else on the root tag. */
export const refusalMarkers = (error: unknown, source: string): BsxMarker[] => {
  if (!error) return [];
  const { message, technical } = describeError(error);
  const text = technical ?? message;
  const at = /line (\d+), column (\d+)/i.exec(text);
  if (!at) return [{ message: text, range: rootRange(source), severity: "error" }];
  const start = offsetAtCodePoint(source, Number(at[1]), Number(at[2]));
  return [{ message: text, range: { start, end: start + 1 }, severity: "error" }];
};
