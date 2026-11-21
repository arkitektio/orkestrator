import { parseBsxSafe } from "@arkitektio/bsx/bsx/index";
import type { AgentDependencyInput } from "@/rekuest/api/graphql";
import { dependencyInput, draftUid, type DependencyDraft } from "./blokDependencies";

/**
 * A blok as a file, to carry it to another organization or keep a copy: its
 * name, its BSX, its demo and the agents it declares. What it is BOUND to is
 * not in it: a blok is bound where it is materialized. Importing one opens
 * the editor on it as a new blok, saved only when the person creates it.
 */

export const BLOK_FILE_KIND = "arkitekt.blok";
export const BLOK_FILE_VERSION = 1;
export const BLOK_FILE_EXTENSION = ".blok.json";

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

const fileName = (name: string) =>
  `${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "blok"
  }${BLOK_FILE_EXTENSION}`;

/** Hand the blok to the person as a file. */
export const downloadBlokFile = (draft: BlokFileDraft) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(blokFileOf(draft), null, 2)], { type: "application/json" }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName(draft.name);
  anchor.click();
  URL.revokeObjectURL(url);
};
