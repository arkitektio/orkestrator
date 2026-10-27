import type {BlokComponentNode} from '../renderer/runtime/types';
import {defaultBlokView, type BlokView} from '../spec/catalogs';
import {diagnosticHint, type BlokFinding} from '../spec/vocabulary';
import {parseBsxSafe, type BsxSourceMap} from './parse';
import {resolveBlokScope} from './infer';
import {checkBlokTree, type BlokCheckScope, type ResolvedBlokScope} from './references';
import type {BsxRange} from './source';

export type BsxMarker = {message: string; range: BsxRange; severity: 'error' | 'warning'; code?: string};

export type BsxAnalysis = {
  /** Null when the text does not parse. */
  tree: BlokComponentNode | null;
  /** Where each node and prop is; empty when the text does not parse. */
  sources: BsxSourceMap;
  /** The validator's findings (none when the text does not parse). */
  findings: BlokFinding[];
  markers: BsxMarker[];
  /** The scope as the tree resolves it (each local's kind; dependencies stay as declared); null when the text does not parse. */
  resolved: ResolvedBlokScope | null;
};

/** Where a finding about `nodeId` (and `propKey`) is in the source; `fallback` when the source map has no such node. */
export const rangeForFinding = (sources: BsxSourceMap, nodeId: string | undefined, propKey: string | undefined, fallback: BsxRange): BsxRange => {
  const source = nodeId ? sources.get(nodeId) : undefined;
  if (!source) return fallback;
  const prop = propKey ? source.props.get(propKey) : undefined;
  if (prop) return prop.valueRange.end > prop.valueRange.start ? prop.valueRange : prop.nameRange;
  return source.tagRange;
};

/**
 * Everything the editor marks in a blok's source: where it does not parse
 * (the parser's first refusal, with its code); else every finding of the v2
 * validator (`checkBlokTree`) against what the blok declares, errors and
 * warnings, each at the node and prop it is about.
 */
/** A marker's text: the message, then how to fix it on a line of its own. */
const withHint = (message: string, hint: string | null): string => (hint ? `${message}\n${hint}` : message);

export const analyzeBsx = (source: string, options: {scope: BlokCheckScope; view?: BlokView}): BsxAnalysis => {
  const view = options.view ?? defaultBlokView();
  const parsed = parseBsxSafe(source, view);
  if (!parsed.ok) {
    return {
      tree: null,
      sources: new Map(),
      findings: [],
      resolved: null,
      markers: [{message: withHint(parsed.error.message, diagnosticHint(parsed.error.code, parsed.error.fields)), range: parsed.error.range, severity: 'error', code: parsed.error.code}],
    };
  }
  const {tree, sources} = parsed;
  const whole = sources.get(tree.id)?.tagRange ?? {start: 0, end: 1};
  const findings = checkBlokTree(tree, options.scope, view);
  const markers = findings.map(
    (found): BsxMarker => ({
      message: withHint(found.message, found.hint ?? null),
      range: rangeForFinding(sources, found.nodeId, found.propKey, whole),
      severity: found.level,
      code: found.code,
    }),
  );
  return {tree, sources, findings, markers, resolved: resolveBlokScope(tree, options.scope, view)};
};
