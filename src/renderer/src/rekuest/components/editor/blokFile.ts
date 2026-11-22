import { blokHeader, parseBsxSafe, printBsx } from "@arkitektio/bsx/bsx/index";
import type { BlokComponentNode } from "@arkitektio/bsx/renderer/runtime/types";
import type { AgentDependencyInput, BlokEditorFragment, ComponentContext, CreateBlokInput } from "@/rekuest/api/graphql";
import { buildDeclarations, declarationsDraft } from "./blokDeclarationsDraft";
import { dependencyDraft, dependencyInput, draftUid, type DependencyDraft } from "./blokDependencies";

/**
 * A blok as a file, to carry it to another organization or keep a copy: its
 * name, its BSX, its demo and the agents it declares. What it is BOUND to is
 * not in it: a blok is bound where it is materialized. Importing one opens
 * the editor on it as a new blok, saved only when the person creates it.
 */

export const BLOK_FILE_KIND = "arkitekt.blok";
export const BLOK_FILE_VERSION = 1;
export const BLOK_FILE_EXTENSION = ".blok.json";
/** The expression vocabulary the editor writes, and a file installs with. */
export const BLOK_VOCAB = 2;

/** What the editor holds of a blok: the same shape it drafts in. */
export type BlokFileDraft = {
  name: string;
  description: string;
  source: string;
  dependencies: DependencyDraft[];
  declarations: { demo: string };
};

export type BlokFile = {
  kind: typeof BLOK_FILE_KIND;
  version: number;
  name: string;
  description: string;
  source: string;
  demo: unknown;
  dependencies: AgentDependencyInput[];
};

const demoOf = (text: string): unknown => {
  try {
    return JSON.parse(text.trim() || "{}") as unknown;
  } catch {
    return {};
  }
};

export const blokFileOf = (draft: BlokFileDraft): BlokFile => ({
  kind: BLOK_FILE_KIND,
  version: BLOK_FILE_VERSION,
  name: draft.name.trim(),
  description: draft.description.trim(),
  source: draft.source,
  demo: demoOf(draft.declarations.demo),
  dependencies: draft.dependencies.map(dependencyInput),
});

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** A declared dependency read back into a draft; a demand is kept as it was written. */
const draftOfInput = (input: AgentDependencyInput): DependencyDraft => ({
  uid: draftUid(),
  key: text(input.key),
  app: text(input.app),
  version: text(input.version),
  description: text(input.description),
  optional: input.optional === true,
  autoResolvable: input.autoResolvable === true,
  minViableInstances: typeof input.minViableInstances === "number" ? input.minViableInstances : null,
  maxViableInstances: typeof input.maxViableInstances === "number" ? input.maxViableInstances : null,
  actions: (input.actionDependencies ?? []).map((action) => ({
    key: text(action.key),
    description: text(action.description),
    optional: action.optional === true,
    demand: action.demand ?? null,
  })),
  states: (input.stateDependencies ?? []).map((state) => ({
    key: text(state.key),
    description: text(state.description),
    optional: state.optional === true,
    demand: state.demand ?? null,
  })),
  locked: false,
});

export type ParsedBlokFile = { ok: true; draft: BlokFileDraft } | { ok: false; error: string };

/** A file's text as a draft the editor opens; why not, in a sentence, when it is not a blok. */
export const parseBlokFile = (content: string): ParsedBlokFile => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    // A bare .bsx file: the source alone is a blok too.
    const bare = parseBsxSafe(content);
    if (bare.ok) {
      return { ok: true, draft: { name: "", description: "", source: content, dependencies: [], declarations: { demo: "{}" } } };
    }
    return { ok: false, error: "This file is neither a blok file nor BSX." };
  }
  if (!parsed || typeof parsed !== "object" || (parsed as { kind?: unknown }).kind !== BLOK_FILE_KIND) {
    return { ok: false, error: "This is not a blok file." };
  }
  const file = parsed as Partial<BlokFile>;
  if (typeof file.version === "number" && file.version > BLOK_FILE_VERSION) {
    return { ok: false, error: "This blok file was written by a newer version of the app." };
  }
  const source = text(file.source);
  const checked = parseBsxSafe(source);
  if (!checked.ok) return { ok: false, error: `Its BSX does not parse: ${checked.error.message}` };
  return {
    ok: true,
    draft: {
      name: text(file.name),
      description: text(file.description),
      source,
      dependencies: Array.isArray(file.dependencies) ? file.dependencies.map(draftOfInput) : [],
      declarations: { demo: JSON.stringify(file.demo && typeof file.demo === "object" ? file.demo : {}, null, 2) },
    },
  };
};

/** `My panel` → `my-panel.blok.json`. */
export const blokFileName = (name: string) =>
  `${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "blok"
  }${BLOK_FILE_EXTENSION}`;

/** The file's text, as it is downloaded or copied. */
export const blokFileText = (draft: BlokFileDraft) => JSON.stringify(blokFileOf(draft), null, 2);

/** Hand the blok to the person as a file. */
export const downloadBlokFile = (draft: BlokFileDraft) => {
  const url = URL.createObjectURL(new Blob([blokFileText(draft)], { type: "application/json" }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = blokFileName(draft.name);
  anchor.click();
  URL.revokeObjectURL(url);
};

export type BlokDraftOf = { ok: true; draft: BlokFileDraft } | { ok: false; error: string };

/** A saved template as a file's draft: its tree printed back to BSX, when BSX can spell it. */
export const draftOfBlok = (
  blok: Pick<BlokEditorFragment, "name" | "description" | "componentTree" | "dependencies" | "demo">,
): BlokDraftOf => {
  const roots = (blok.componentTree ?? []) as BlokComponentNode[];
  if (roots.length !== 1) return { ok: false, error: `BSX holds one root; ${blok.name} has ${roots.length}.` };
  try {
    return {
      ok: true,
      draft: {
        name: blok.name,
        description: blok.description ?? "",
        source: printBsx(roots[0]),
        dependencies: blok.dependencies.map(dependencyDraft),
        declarations: declarationsDraft(blok),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * What creating a template from a file sends, under `name` (a free one: a
 * template created under a taken name would change that one). Null when its
 * BSX no longer parses.
 */
export const blokFileCreateInput = (draft: BlokFileDraft, name: string): CreateBlokInput | null => {
  const parsed = parseBsxSafe(draft.source);
  if (!parsed.ok) return null;
  const header = blokHeader(parsed.tree);
  return {
    name,
    description: draft.description.trim() || null,
    context: (header?.context ?? "PANEL") as ComponentContext,
    source: draft.source,
    vocab: BLOK_VOCAB,
    // As the editor sends it: only the demo's own roots.
    demo: buildDeclarations(draft.declarations).demo,
    dependencies: draft.dependencies.map(dependencyInput),
  };
};
