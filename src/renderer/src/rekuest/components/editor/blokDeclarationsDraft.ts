import { parseBsxArgument, printBsx, BsxSyntaxError, type BlokScopeLocal, type BlokScopeLocalPort, type BlokScopeQuery, type BlokScopeSubscription } from "@arkitektio/bsx/bsx/index";
import { isLocalName } from "@arkitektio/bsx/bsx/expr";
import { normalizeBlokArgument, type BlokActionArgument } from "@arkitektio/bsx/renderer/runtime/index";
import { loadVocabulary } from "@arkitektio/bsx/spec/vocabulary";
import { LocalKind, PortKind, type ActionArgumentInput, type BlokLocalInput, type BlokQueryInput, type BlokSubscriptionInput, type ChoiceInput } from "../../api/graphql";

/**
 * What the blok editor edits beside the BSX (blok language v2): the locals
 * (form state: each a port, optionally kept on this device), the declared
 * queries and subscriptions (the read side) and the demo (what the preview
 * shows, mirroring the roots). Drafts are text where the author types an
 * expression or JSON; they become the wire inputs on save.
 */

/**
 * The kinds a local may say: what a control writes or a task call takes
 * (vocabulary `locals.arg_kinds`), or ANY, an untyped value that is checked
 * against nothing. A local may also say none (`null` in a draft): the kind is
 * then inferred from the tree (its default, the task argument it is passed
 * to, the control bound to it), ANY when nothing tells.
 */
export const LOCAL_KINDS = [
  LocalKind.String,
  LocalKind.Int,
  LocalKind.Float,
  LocalKind.Bool,
  LocalKind.Enum,
  LocalKind.Date,
  LocalKind.Quantity,
  LocalKind.List,
  LocalKind.Dict,
  LocalKind.Model,
  LocalKind.Structure,
  LocalKind.Any,
] as const;

const isPortKind = (value: string): value is PortKind => (Object.values(PortKind) as string[]).includes(value);
const isLocalKind = (value: string): value is LocalKind => (Object.values(LocalKind) as string[]).includes(value);

/** A local: an arg port (key, kind, identifier, nullable, default, choices, label, description) plus `persist`. */
export type LocalDraft = {
  key: string;
  /** Its kind; null says none, so it is inferred from the tree (ANY when nothing tells). */
  kind: LocalKind | null;
  /** A structure's (or a model's, an enum's) identifier, `@mikro/image`; empty for none. */
  identifier: string;
  nullable: boolean;
  /** Its default, as JSON text. */
  defaultText: string;
  /**
   * Its choices (an ENUM needs them), as JSON text: a list of `{value, label, description?}`,
   * empty for none. Children of a LIST/DICT/MODEL come along unedited.
   */
  choicesText: string;
  label: string;
  description: string;
  /** Kept on this device between openings. */
  persist: boolean;
  /** Child ports (a list's item, a dict's or model's fields), kept as they came. */
  children: readonly WireLocalPort[] | null;
};

export const newLocalDraft = (key = ""): LocalDraft => ({
  key,
  kind: null,
  identifier: "",
  nullable: false,
  defaultText: "null",
  choicesText: "",
  label: "",
  description: "",
  persist: false,
  children: null,
});

export type VariableDraft = { key: string; /** An expression over args, locals and dependencies (`args.slide.id`). */ expression: string };

export type ReadDraft = {
  kind: "query" | "subscription";
  key: string;
  service: string;
  document: string;
  variables: VariableDraft[];
  /** Queries: re-run every this many seconds (text; empty for none). */
  poll: string;
  /** Queries: the list field (a dotted path into the data) `fetch_more` appends pages to; empty for none. */
  more: string;
  /** Subscriptions: keep the last this many payloads (text; empty: the latest only). */
  keep: string;
  /** Subscriptions: the query to replay from while travelling. */
  history: string;
};

export type DeclarationsDraft = {
  locals: LocalDraft[];
  reads: ReadDraft[];
  /** The demo as JSON text: `{deps, args, task, queries, subscriptions}`. */
  demo: string;
};

export const emptyDeclarationsDraft = (): DeclarationsDraft => ({ locals: [], reads: [], demo: "{}" });

type WireChoice = { value?: unknown; label?: string | null; description?: string | null };

/** A local's port as the server serves it (an `ArgPort`'s fields). */
export type WireLocalPort = {
  key: string;
  kind: string;
  identifier?: string | null;
  nullable?: boolean | null;
  default?: unknown;
  choices?: ReadonlyArray<WireChoice> | null;
  children?: ReadonlyArray<WireLocalPort> | null;
  label?: string | null;
  description?: string | null;
};

/** A local as the blok wrote it (`Blok.locals`): its kind null when it was left out. */
type WireLocal = Omit<WireLocalPort, "kind"> & { kind?: string | null; persist?: boolean | null };
type WireRead = {
  key: string;
  service: string;
  document: string;
  variables?: unknown;
  poll?: number | null;
  more?: string | null;
  keep?: number | null;
  history?: string | null;
};

/** The demo as the editor shows it: the roots it mirrors that hold something, no `__typename`. */
const demoOf = (demo: unknown): Record<string, unknown> =>
  demo && typeof demo === "object" && !Array.isArray(demo)
    ? Object.fromEntries(Object.entries(demo).filter(([key, value]) => key !== "__typename" && value != null))
    : {};

/** A stored argument printed back as the expression it was written as. */
const expressionOf = (raw: unknown): string => {
  const argument = normalizeBlokArgument(raw) as BlokActionArgument;
  if (argument.value_path != null) return argument.value_path;
  if (argument.value_literal !== undefined) return JSON.stringify(argument.value_literal);
  // Anything else (a call, a list) prints through the BSX printer as an attribute.
  try {
    const printed = printBsx({ id: "Text[0]", component: "Text", props: [{ key: "x", util_call: argument.util_call ?? null }] });
    const match = /x=\{(.*)\} \/>$/s.exec(printed);
    return match ? match[1] : "";
  } catch {
    return "";
  }
};

export const declarationsDraft = (blok: {
  locals: ReadonlyArray<WireLocal>;
  queries: ReadonlyArray<WireRead>;
  subscriptions: ReadonlyArray<WireRead>;
  demo?: unknown;
}): DeclarationsDraft => {
  const variables = (raw: unknown): VariableDraft[] =>
    (Array.isArray(raw) ? raw : []).map((argument) => {
      const normalized = normalizeBlokArgument(argument) as BlokActionArgument;
      return { key: normalized.key ?? "", expression: expressionOf(argument) };
    });
  return {
    locals: blok.locals.map((local): LocalDraft => ({
      key: local.key,
      // As written: a kind the blok left out stays out, so a re-save never pins an inferred one.
      kind: local.kind != null && isLocalKind(local.kind) ? local.kind : null,
      identifier: local.identifier ?? "",
      nullable: local.nullable === true,
      defaultText: JSON.stringify(local.default ?? null),
      choicesText: local.choices?.length
        ? JSON.stringify(
            local.choices.map((choice) => ({ value: choice.value ?? null, label: choice.label ?? "", ...(choice.description ? { description: choice.description } : {}) })),
          )
        : "",
      label: local.label ?? "",
      description: local.description ?? "",
      persist: local.persist === true,
      children: local.children ?? null,
    })),
    reads: [
      ...blok.queries.map((query): ReadDraft => ({
        kind: "query",
        key: query.key,
        service: query.service,
        document: query.document,
        variables: variables(query.variables),
        poll: query.poll == null ? "" : String(query.poll),
        more: query.more ?? "",
        keep: "",
        history: "",
      })),
      ...blok.subscriptions.map((subscription): ReadDraft => ({
        kind: "subscription",
        key: subscription.key,
        service: subscription.service,
        document: subscription.document,
        variables: variables(subscription.variables),
        poll: "",
        more: "",
        keep: subscription.keep == null ? "" : String(subscription.keep),
        history: subscription.history ?? "",
      })),
    ],
    demo: JSON.stringify(demoOf(blok.demo), null, 2),
  };
};

/**
 * The kind each local resolves to, by key, for the editor's "inferred: X":
 * the local validator's resolution of the draft (the server resolves the
 * same way), else, while the draft does not parse, the server's
 * `resolvedLocals` as loaded. Shown only; never written back into a draft.
 */
export const inferredLocalKinds = (
  local: ReadonlyArray<{ key: string; kind: string }> | null,
  server: ReadonlyArray<{ key: string; kind: string }> | null | undefined,
): ReadonlyMap<string, string> => new Map((local ?? server ?? []).map((resolved) => [resolved.key, resolved.kind] as const));

/**
 * The locals of the draft as its tree resolves them: the server's dry run
 * (`BlokEdit.resolvedLocals`) when it answered exactly this draft, else the
 * local validator's (null while the source does not parse).
 */
export const draftResolvedLocals = <Local extends { key: string; kind: string }>(
  local: ReadonlyArray<Local> | null,
  server: { checked: string; resolvedLocals: ReadonlyArray<Local> } | null,
  draft: string | null,
): ReadonlyArray<Local> | null => (server !== null && draft !== null && server.checked === draft ? server.resolvedLocals : local);

/** A stored argument as the GraphQL input spells it (camelCase). */
export const argumentInput = (argument: BlokActionArgument): ActionArgumentInput => ({
  ...(argument.key != null ? { key: argument.key } : {}),
  ...(argument.value_literal !== undefined ? { valueLiteral: argument.value_literal } : {}),
  ...(argument.value_path != null ? { valuePath: argument.value_path } : {}),
  ...(argument.util_call
    ? { utilCall: { operation: argument.util_call.operation, arguments: (argument.util_call.arguments ?? []).map(argumentInput) } }
    : {}),
  ...(argument.value_list ? { valueList: argument.value_list.map(argumentInput) } : {}),
  ...(argument.value_dict ? { valueDict: argument.value_dict.map(argumentInput) } : {}),
});

export type DeclarationsBuilt = {
  locals: BlokLocalInput[];
  queries: BlokQueryInput[];
  subscriptions: BlokSubscriptionInput[];
  demo: Record<string, unknown>;
  /** What the validator reads of them (the scope's shape). */
  scope: { locals: BlokScopeLocal[]; queries: BlokScopeQuery[]; subscriptions: BlokScopeSubscription[] };
  /** Problems by where they are (`local:iterations`, `query:positions`, `demo`). */
  problems: Map<string, string>;
};

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false; error: string } => {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Not JSON." };
  }
};

const positiveNumber = (text: string): number | null | undefined => {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const choicesOf = (text: string): { ok: true; value: ChoiceInput[] | null } | { ok: false; error: string } => {
  if (!text.trim()) return { ok: true, value: null };
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, error: `Its choices are not JSON: ${parsed.error}` };
  if (!Array.isArray(parsed.value)) return { ok: false, error: "Its choices are a list of {value, label}." };
  const choices: ChoiceInput[] = [];
  for (const raw of parsed.value as unknown[]) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Each choice is {value, label, description?}." };
    const entry = raw as Record<string, unknown>;
    const label = typeof entry.label === "string" && entry.label ? entry.label : JSON.stringify(entry.value ?? null);
    choices.push({ value: entry.value ?? null, label, ...(typeof entry.description === "string" ? { description: entry.description } : {}) });
  }
  return { ok: true, value: choices };
};

/** A child port as the input spells it (only what a port declares; widgets and effects never apply to a local). */
const childInput = (port: WireLocalPort): NonNullable<BlokLocalInput["children"]>[number] => ({
  key: port.key,
  kind: isPortKind(port.kind) ? port.kind : PortKind.String,
  nullable: port.nullable === true,
  ...(port.identifier ? { identifier: port.identifier } : {}),
  ...(port.default != null ? { default: port.default } : {}),
  ...(port.choices?.length ? { choices: port.choices.map((choice) => ({ value: choice.value ?? null, label: choice.label ?? "" })) } : {}),
  ...(port.children?.length ? { children: port.children.map(childInput) } : {}),
  ...(port.label ? { label: port.label } : {}),
  ...(port.description ? { description: port.description } : {}),
});

const scopePort = (port: WireLocalPort): BlokScopeLocalPort => ({
  key: port.key,
  kind: port.kind,
  identifier: port.identifier ?? null,
  nullable: port.nullable === true,
  default: port.default ?? null,
  choices: port.choices ? port.choices.map((choice) => ({ value: choice.value ?? null, label: choice.label ?? null })) : null,
  children: port.children ? port.children.map(scopePort) : null,
});

/**
 * What the validator reads of a local: its port (default as typed, or null
 * when it is no JSON) plus persist; a local that says no kind leaves it out,
 * for the validator to infer as the server will.
 */
const scopeLocal = (draft: LocalDraft, built: BlokLocalInput | undefined): BlokScopeLocal => ({
  key: draft.key,
  ...(draft.kind !== null ? { kind: draft.kind } : {}),
  identifier: draft.identifier.trim() || null,
  nullable: draft.nullable,
  default: built?.default ?? null,
  choices: built?.choices ? built.choices.map((choice) => ({ value: choice.value ?? null, label: choice.label ?? null })) : null,
  children: draft.children ? draft.children.map(scopePort) : null,
  persist: draft.persist,
});

/** The drafts as the wire inputs a save sends, and what is wrong with them. */
export const buildDeclarations = (draft: DeclarationsDraft): DeclarationsBuilt => {
  const problems = new Map<string, string>();
  const reserved = loadVocabulary().reserved;
  const names = new Set<string>();

  const locals: BlokLocalInput[] = [];
  for (const local of draft.locals) {
    const where = `local:${local.key}`;
    if (!isLocalName(local.key)) problems.set(where, "A local is named like a variable: letters, digits and _.");
    else if (reserved.has(local.key)) problems.set(where, `${local.key} is reserved.`);
    else if (names.has(local.key)) problems.set(where, `${local.key} is declared twice.`);
    names.add(local.key);
    const parsed = parseJson(local.defaultText.trim() || "null");
    if (!parsed.ok) problems.set(where, `Its default is not JSON: ${parsed.error}`);
    const choices = choicesOf(local.choicesText);
    if (!choices.ok) problems.set(where, choices.error);
    else if (local.kind === LocalKind.Enum && !choices.value?.length) problems.set(where, "An ENUM local lists its choices.");
    if (local.kind === LocalKind.Structure && !local.identifier.trim()) problems.set(where, "A STRUCTURE local names its identifier (@mikro/image).");
    const identifier = local.identifier.trim() || null;
    locals.push({
      key: local.key,
      // No kind: the key is left out, so the server infers it (never sent as null or a default).
      ...(local.kind !== null ? { kind: local.kind } : {}),
      nullable: local.nullable,
      persist: local.persist,
      ...(identifier ? { identifier } : {}),
      ...(parsed.ok && parsed.value !== null ? { default: parsed.value } : {}),
      ...(choices.ok && choices.value ? { choices: choices.value } : {}),
      ...(local.children ? { children: local.children.map(childInput) } : {}),
      ...(local.label.trim() ? { label: local.label.trim() } : {}),
      ...(local.description.trim() ? { description: local.description.trim() } : {}),
    });
  }

  const queries: BlokQueryInput[] = [];
  const subscriptions: BlokSubscriptionInput[] = [];
  const scopeQueries: BlokScopeQuery[] = [];
  const scopeSubscriptions: BlokScopeSubscription[] = [];
  const readNames = { query: new Set<string>(), subscription: new Set<string>() };
  for (const read of draft.reads) {
    const where = `${read.kind}:${read.key}`;
    if (!isLocalName(read.key)) problems.set(where, "A read is named like a variable: letters, digits and _.");
    if (readNames[read.kind].has(read.key)) problems.set(where, `${read.key} is declared twice.`);
    readNames[read.kind].add(read.key);
    if (!read.service.trim()) problems.set(where, "Name the service it runs on.");
    const variables: BlokActionArgument[] = [];
    for (const variable of read.variables) {
      if (!variable.key.trim()) continue;
      try {
        variables.push(parseBsxArgument(variable.key, variable.expression.trim() || "null"));
      } catch (error) {
        problems.set(where, `$${variable.key}: ${error instanceof BsxSyntaxError ? error.message : String(error)}`);
      }
    }
    if (read.kind === "query") {
      const poll = positiveNumber(read.poll);
      if (poll === undefined) problems.set(where, "Poll is a number of seconds.");
      queries.push({
        key: read.key,
        service: read.service.trim(),
        document: read.document,
        variables: variables.map(argumentInput),
        poll: poll ?? null,
        more: read.more.trim() || null,
      });
      scopeQueries.push({ key: read.key, service: read.service.trim(), document: read.document, variables, poll: poll ?? null, more: read.more.trim() || null });
    } else {
      const keep = positiveNumber(read.keep);
      if (keep === undefined || (keep !== null && !Number.isInteger(keep))) problems.set(where, "Keep is a whole number of payloads.");
      subscriptions.push({
        key: read.key,
        service: read.service.trim(),
        document: read.document,
        variables: variables.map(argumentInput),
        keep: keep ?? null,
        history: read.history.trim() || null,
      });
      scopeSubscriptions.push({
        key: read.key,
        service: read.service.trim(),
        document: read.document,
        variables,
        keep: keep ?? null,
        history: read.history.trim() || null,
      });
    }
  }

  const demoParsed = parseJson(draft.demo.trim() || "{}");
  let demo: Record<string, unknown> = {};
  if (!demoParsed.ok) problems.set("demo", demoParsed.error);
  else if (!demoParsed.value || typeof demoParsed.value !== "object" || Array.isArray(demoParsed.value)) {
    problems.set("demo", "The demo is a JSON object: {deps, args, task, queries, subscriptions}.");
  } else {
    demo = demoParsed.value as Record<string, unknown>;
    const known = new Set(["deps", "args", "task", "queries", "subscriptions"]);
    const unknown = Object.keys(demo).filter((key) => !known.has(key));
    if (unknown.length) problems.set("demo", `The demo mirrors the roots (deps, args, task, queries, subscriptions), not ${unknown.join(", ")}.`);
  }

  return {
    locals,
    queries,
    subscriptions,
    demo,
    scope: {
      locals: draft.locals.map((local, index) => scopeLocal(local, locals[index])),
      queries: scopeQueries,
      subscriptions: scopeSubscriptions,
    },
    problems,
  };
};
