import vocabularyJson from './vocabulary.json';

/**
 * The blok language, version 2, as arkitekt-spec publishes it
 * (`arkitekt_spec/blok/vocabulary.json`, synced here byte for byte by the
 * spec's `scripts/sync_standard_catalog.py`). Everything the parser, the
 * editor and the renderer know about roots, records, functions, the theme and
 * diagnostics is read from this one file, never restated.
 */

export type BlokKind = 'agent' | 'custom' | 'task' | 'action' | 'action_logo';
export const BLOK_KINDS: readonly BlokKind[] = ['agent', 'custom', 'task', 'action', 'action_logo'];

export type BlokContextName = 'HTML' | 'SCENE' | 'OVERLAY' | 'LOGO';

export type VocabParam = {key: string; kind: string; required: boolean};

export type VocabFunction = {
  name: string;
  params: readonly VocabParam[];
  returns: string;
  description: string;
  null: string;
  /** Arguments are read only as needed (`logic.all`, `logic.choose`). */
  lazy: boolean;
  /** Allowed only as a callback's one thing (`ui.copy`, `task.answer`, `query.refetch`). */
  effect: boolean;
  /** Sees a pending or failed argument instead of suspending. */
  seesStatus: boolean;
  /** The parameter names, in positional order. */
  keys: readonly string[];
  /** The parameters every call passes. */
  requiredKeys: readonly string[];
};

export type VocabRecordField = {
  key: string;
  kind: string;
  nullable: boolean;
  choices: readonly string[] | null;
  children: readonly VocabRecordField[] | null;
  description: string | null;
};

export type VocabRecord = {
  description: string;
  fields: readonly VocabRecordField[];
  idle: Readonly<Record<string, unknown>> | null;
};

export type VocabKind = {
  description: string;
  roots: readonly string[];
  locals: boolean;
  contexts: readonly BlokContextName[];
};

export type VocabContext = {text: boolean; description: string};

export type VocabDiagnostic = {
  level: 'error' | 'warning';
  message: string;
  /** No checker raises it: the renderer's error code on a record (`deps.unbound`). */
  runtime: boolean;
  /** How to fix it, a template filled like the message; null when the message says it already. */
  hint: string | null;
};

export type VocabTheme = {
  colourRoles: readonly string[];
  statusRoles: readonly string[];
  colourUtilities: readonly string[];
  paletteColours: readonly string[];
  paletteRoleHints: Readonly<Record<string, string>>;
  logoPens: readonly string[];
  logoPaintProps: readonly string[];
  /** Scene props painted with a theme colour role (resolved against the viewer's brand). */
  scenePaintProps: readonly string[];
  customVariants: readonly string[];
  dataAttributes: Readonly<Record<string, string>>;
  /** The fixed-hue roles for data with a colour of its own (`spectrum-violet` ... `spectrum-red`), without `-soft`. */
  spectralRoles: readonly string[];
  /** How theme.css draws the spectral roles (vocabulary `theme.spectrum`). */
  spectrum: VocabSpectrum;
};

/** One spectral band: its fixed hue, its lightness in light and dark mode, and its wavelengths `[low, high)` in nm. */
export type VocabSpectralBand = {band: string; hue: number; light: number; dark: number; nm: readonly [number, number]};

/** The spectral roles' formulas (`<light>`/`<dark>`/`<hue>` placeholders) and bands, in vocabulary order. */
export type VocabSpectrum = {
  /** The declaration of `--spectrum-chroma`, as theme.css writes it. */
  chroma: string;
  role: {light: string; dark: string};
  soft: {light: string; dark: string};
  bands: readonly VocabSpectralBand[];
};

const parseSpectrum = (raw: unknown): VocabSpectrum => {
  const entry = object(raw, 'theme.spectrum');
  const modes = (value: unknown, where: string) => {
    const pair = object(value, where);
    return {light: string(pair.light, `${where}.light`), dark: string(pair.dark, `${where}.dark`)};
  };
  const bands = Object.entries(object(entry.bands, 'theme.spectrum.bands')).map(([band, value]): VocabSpectralBand => {
    const where = `theme.spectrum.bands.${band}`;
    const spec = object(value, where);
    const nm = list(spec.nm, `${where}.nm`);
    return {
      band,
      hue: number(spec.hue, `${where}.hue`),
      light: number(spec.light, `${where}.light`),
      dark: number(spec.dark, `${where}.dark`),
      nm: [number(nm[0], `${where}.nm[0]`), number(nm[1], `${where}.nm[1]`)],
    };
  });
  return {
    chroma: string(entry.chroma, 'theme.spectrum.chroma'),
    role: modes(entry.role, 'theme.spectrum.role'),
    soft: modes(entry.soft, 'theme.spectrum.soft'),
    bands,
  };
};

/** What a local may be (vocabulary `locals`): an arg port plus `persist`. */
export type VocabLocals = {
  /** The fields a local adds to its port (`persist`). */
  fields: readonly string[];
  /** Per catalog kind of a bind prop, the port kinds of the locals it may write; a kind not listed (ANY) writes any. */
  bindKinds: Readonly<Record<string, readonly string[]>>;
  /** Per port kind of a local passed whole to a task call, the arg port kinds that take it. */
  argKinds: Readonly<Record<string, readonly string[]>>;
};

export type VocabLimits = {
  logoMaxNodes: number;
  logoMaxDepth: number;
  logoMaxPathData: number;
  logoMaxForeachItems: number;
  logoPathDataProps: readonly string[];
};

export type BlokVocabulary = {
  vocab: number;
  /** `self deps queries subscriptions args task event viewer then`, with what each means. */
  dataRoots: Readonly<Record<string, string>>;
  /** Roots bound only somewhere: `event` (a callback), `error` (an `<error>` slot). */
  scopedRoots: Readonly<Record<string, string>>;
  functionNamespaces: readonly string[];
  futureRoots: readonly string[];
  /** The one reserved list: no local, let or into may use one of these. */
  reserved: ReadonlySet<string>;
  agentSegments: {
    tasks: string;
    assets: string;
    fields: Readonly<Record<string, string>>;
    reservedStateNames: readonly string[];
  };
  kinds: Readonly<Record<BlokKind, VocabKind>>;
  contexts: Readonly<Record<BlokContextName, VocabContext>>;
  /** A blok's root component → the blok context it names (`Html` → `HTML`). */
  blokRoots: Readonly<Record<string, string>>;
  records: Readonly<Record<string, VocabRecord>>;
  statuses: Readonly<Record<string, string>>;
  alwaysReady: readonly string[];
  functions: ReadonlyMap<string, VocabFunction>;
  /** Operator → the stored call it desugars to (`==` → `cmp.eq`). */
  operators: Readonly<Record<string, string>>;
  callKinds: readonly string[];
  reservedCallKinds: readonly string[];
  explicitId: RegExp;
  theme: VocabTheme;
  limits: VocabLimits;
  locals: VocabLocals;
  baseVersion: number;
  /** The standard catalogs by name, at their versions (`ui: 1`). */
  catalogs: Readonly<Record<string, number>>;
  diagnostics: ReadonlyMap<string, VocabDiagnostic>;
};

/* -------------------------------------------------------------------------- */
/* Narrowing helpers: the file is data, read as `unknown` and checked.         */
/* -------------------------------------------------------------------------- */

type Json = null | boolean | number | string | Json[] | {[key: string]: Json};
type JsonObject = {[key: string]: Json};

const object = (value: unknown, where: string): JsonObject => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`vocabulary: ${where} is not an object`);
  }
  return value as JsonObject;
};

const list = (value: unknown, where: string): Json[] => {
  if (!Array.isArray(value)) throw new Error(`vocabulary: ${where} is not a list`);
  return value as Json[];
};

const string = (value: unknown, where: string): string => {
  if (typeof value !== 'string') throw new Error(`vocabulary: ${where} is not a string`);
  return value;
};

const strings = (value: unknown, where: string): string[] => list(value, where).map((item, index) => string(item, `${where}[${index}]`));

const number = (value: unknown, where: string): number => {
  if (typeof value !== 'number') throw new Error(`vocabulary: ${where} is not a number`);
  return value;
};

const kindTable = (value: unknown, where: string): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(object(value, where))
      .filter(([key]) => key !== 'description')
      .map(([key, item]) => [key, strings(item, `${where}.${key}`)]),
  );

const stringMap = (value: unknown, where: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(object(value, where))
      .filter(([key]) => key !== 'description')
      .map(([key, item]) => [key, string(item, `${where}.${key}`)]),
  );

const isContext = (value: string): value is BlokContextName =>
  value === 'HTML' || value === 'SCENE' || value === 'OVERLAY' || value === 'LOGO';

const recordFields = (value: unknown, where: string): VocabRecordField[] =>
  list(value, where).map((raw, index) => {
    const entry = object(raw, `${where}[${index}]`);
    return {
      key: string(entry.key, `${where}[${index}].key`),
      kind: string(entry.kind, `${where}[${index}].kind`),
      nullable: entry.nullable === true,
      choices: entry.choices === undefined ? null : strings(entry.choices, `${where}[${index}].choices`),
      children: entry.children === undefined ? null : recordFields(entry.children, `${where}[${index}].children`),
      description: typeof entry.description === 'string' ? entry.description : null,
    };
  });

const parseFunction = (name: string, raw: unknown): VocabFunction => {
  const entry = object(raw, `functions.${name}`);
  const params = list(entry.params, `functions.${name}.params`).map((param, index) => {
    const spec = list(param, `functions.${name}.params[${index}]`);
    return {
      key: string(spec[0], `functions.${name}.params[${index}][0]`),
      kind: string(spec[1], `functions.${name}.params[${index}][1]`),
      required: spec.length > 2 ? spec[2] === true : true,
    };
  });
  return {
    name,
    params,
    returns: string(entry.returns, `functions.${name}.returns`),
    description: typeof entry.description === 'string' ? entry.description : '',
    null: typeof entry.null === 'string' ? entry.null : '',
    lazy: entry.lazy === true,
    effect: entry.effect === true,
    seesStatus: entry.sees_status === true,
    keys: params.map(param => param.key),
    requiredKeys: params.filter(param => param.required).map(param => param.key),
  };
};

export const parseVocabulary = (raw: unknown): BlokVocabulary => {
  const root = object(raw, 'the file');
  const roots = object(root.roots, 'roots');

  const kindsRaw = object(root.kinds, 'kinds');
  const kinds = {} as Record<BlokKind, VocabKind>;
  for (const kind of BLOK_KINDS) {
    const entry = object(kindsRaw[kind], `kinds.${kind}`);
    kinds[kind] = {
      description: typeof entry.description === 'string' ? entry.description : '',
      roots: strings(entry.roots, `kinds.${kind}.roots`),
      locals: entry.locals === true,
      contexts: strings(entry.contexts, `kinds.${kind}.contexts`).filter(isContext),
    };
  }

  const contextsRaw = object(root.contexts, 'contexts');
  const contexts = {} as Record<BlokContextName, VocabContext>;
  for (const [name, value] of Object.entries(contextsRaw)) {
    if (!isContext(name)) continue;
    const entry = object(value, `contexts.${name}`);
    contexts[name] = {
      text: entry.text === true,
      description: typeof entry.description === 'string' ? entry.description : '',
    };
  }

  const blokRoots = stringMap(object(root.blok_roots, 'blok_roots').roots, 'blok_roots.roots');

  const recordsRaw = object(root.records, 'records');
  const records: Record<string, VocabRecord> = {};
  for (const [name, value] of Object.entries(recordsRaw)) {
    const entry = object(value, `records.${name}`);
    records[name] = {
      description: typeof entry.description === 'string' ? entry.description : '',
      fields: recordFields(entry.fields, `records.${name}.fields`),
      idle: entry.idle === undefined ? null : object(entry.idle, `records.${name}.idle`),
    };
  }

  const functionsRaw = object(root.functions, 'functions');
  const functions = new Map<string, VocabFunction>();
  for (const [name, value] of Object.entries(functionsRaw)) {
    if (name === 'description') continue;
    functions.set(name, parseFunction(name, value));
  }

  const operatorsRaw = object(root.operators, 'operators');
  const operators: Record<string, string> = {};
  for (const [key, value] of Object.entries(operatorsRaw)) {
    if (typeof value === 'string' && key !== 'description' && key !== 'notes') operators[key] = value;
  }

  const calls = object(root.calls, 'calls');
  const asyncRaw = object(root.async, 'async');
  const storedTree = object(root.stored_tree, 'stored_tree');
  const agentSegments = object(root.agent_segments, 'agent_segments');
  const theme = object(root.theme, 'theme');
  const limits = object(root.limits, 'limits');
  const catalogs = object(root.catalogs, 'catalogs');
  const locals = object(root.locals, 'locals');

  const diagnosticsRaw = object(root.diagnostics, 'diagnostics');
  const diagnostics = new Map<string, VocabDiagnostic>();
  for (const [code, value] of Object.entries(diagnosticsRaw)) {
    if (code === 'description') continue;
    const entry = object(value, `diagnostics.${code}`);
    diagnostics.set(code, {
      level: entry.level === 'warning' ? 'warning' : 'error',
      message: string(entry.message, `diagnostics.${code}.message`),
      runtime: entry.runtime === true,
      hint: typeof entry.hint === 'string' ? entry.hint : null,
    });
  }

  return {
    vocab: number(root.vocab, 'vocab'),
    dataRoots: stringMap(roots.data, 'roots.data'),
    scopedRoots: stringMap(roots.scoped, 'roots.scoped'),
    functionNamespaces: strings(roots.functions, 'roots.functions'),
    futureRoots: strings(roots.future, 'roots.future'),
    reserved: new Set(strings(root.reserved, 'reserved')),
    agentSegments: {
      tasks: string(agentSegments.tasks, 'agent_segments.tasks'),
      assets: string(agentSegments.assets, 'agent_segments.assets'),
      fields: stringMap(agentSegments.fields, 'agent_segments.fields'),
      reservedStateNames: strings(agentSegments.reserved_state_names, 'agent_segments.reserved_state_names'),
    },
    kinds,
    contexts,
    blokRoots,
    records,
    statuses: stringMap(asyncRaw.statuses, 'async.statuses'),
    alwaysReady: strings(asyncRaw.always_ready, 'async.always_ready'),
    functions,
    operators,
    callKinds: Object.keys(object(calls.kinds, 'calls.kinds')),
    reservedCallKinds: Object.keys(object(calls.reserved_kinds, 'calls.reserved_kinds')),
    explicitId: new RegExp(string(storedTree.explicit_id, 'stored_tree.explicit_id')),
    theme: {
      colourRoles: strings(theme.colour_roles, 'theme.colour_roles'),
      statusRoles: strings(theme.status_roles, 'theme.status_roles'),
      colourUtilities: strings(theme.colour_utilities, 'theme.colour_utilities'),
      paletteColours: strings(theme.palette_colours, 'theme.palette_colours'),
      paletteRoleHints: stringMap(theme.palette_role_hints, 'theme.palette_role_hints'),
      logoPens: strings(theme.logo_pens, 'theme.logo_pens'),
      logoPaintProps: strings(theme.logo_paint_props, 'theme.logo_paint_props'),
      scenePaintProps: strings(theme.scene_paint_props, 'theme.scene_paint_props'),
      customVariants: strings(theme.custom_variants, 'theme.custom_variants'),
      dataAttributes: stringMap(theme.data_attributes, 'theme.data_attributes'),
      spectralRoles: strings(theme.spectral_roles, 'theme.spectral_roles'),
      spectrum: parseSpectrum(theme.spectrum),
    },
    limits: {
      logoMaxNodes: number(limits.logo_max_nodes, 'limits.logo_max_nodes'),
      logoMaxDepth: number(limits.logo_max_depth, 'limits.logo_max_depth'),
      logoMaxPathData: number(limits.logo_max_path_data, 'limits.logo_max_path_data'),
      logoMaxForeachItems: number(limits.logo_max_foreach_items, 'limits.logo_max_foreach_items'),
      logoPathDataProps: strings(limits.logo_path_data_props, 'limits.logo_path_data_props'),
    },
    locals: {
      fields: strings(locals.fields, 'locals.fields'),
      bindKinds: kindTable(locals.bind_kinds, 'locals.bind_kinds'),
      argKinds: kindTable(locals.arg_kinds, 'locals.arg_kinds'),
    },
    baseVersion: number(catalogs.base, 'catalogs.base'),
    catalogs: Object.fromEntries(
      Object.entries(object(catalogs.standard, 'catalogs.standard')).map(([name, version]) => [name, number(version, `catalogs.standard.${name}`)]),
    ),
    diagnostics,
  };
};

let cached: BlokVocabulary | null = null;

/** The vocabulary, parsed once. */
export const loadVocabulary = (): BlokVocabulary => {
  if (!cached) cached = parseVocabulary(vocabularyJson);
  return cached;
};

/** Whether `id` is an explicit id (`ot2-monitor`), as opposed to a derived one (`Card[0]/Button[1]`). */
export const isExplicitId = (id: string): boolean => {
  const pattern = loadVocabulary().explicitId;
  const match = pattern.exec(id);
  return match !== null && match.index === 0 && match[0].length === id.length;
};

export type DiagnosticFields = Readonly<Record<string, unknown>>;

const formatField = (value: unknown, repr: boolean): string => {
  if (repr) {
    if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    return value === null || value === undefined ? 'None' : String(value);
  }
  if (Array.isArray(value)) return value.map(item => String(item)).join(', ');
  return value === null || value === undefined ? '' : String(value);
};

/**
 * A diagnostic's message, its template filled the way Python's `str.format`
 * fills it (`{name}`, `{name!r}`, `{{` and `}}`). A field the caller did not
 * give is shown as its name in braces. Parity compares codes, never this text.
 */
export const diagnosticMessage = (code: string, fields: DiagnosticFields = {}): string => {
  const spec = loadVocabulary().diagnostics.get(code);
  if (!spec) return code;
  return fillTemplate(spec.message, fields);
};

/** How to fix `code`, filled like its message; null when its row has no hint. */
export const diagnosticHint = (code: string, fields: DiagnosticFields = {}): string | null => {
  const hint = loadVocabulary().diagnostics.get(code)?.hint;
  return hint ? fillTemplate(hint, fields) : null;
};

const fillTemplate = (template: string, fields: DiagnosticFields): string =>
  template.replace(/\{\{|\}\}|\{([A-Za-z_][A-Za-z0-9_]*)(!r)?\}/g, (token, name: string | undefined, repr: string | undefined) => {
    if (token === '{{') return '{';
    if (token === '}}') return '}';
    if (!name) return token;
    if (!(name in fields)) return `{${name}}`;
    return formatField(fields[name], repr === '!r');
  });

export const diagnosticLevel = (code: string): 'error' | 'warning' =>
  loadVocabulary().diagnostics.get(code)?.level ?? 'error';

/** A diagnostic: a vocabulary code, the fields its message is filled with, and where it is. */
export type BlokFinding = {
  code: string;
  level: 'error' | 'warning';
  message: string;
  /** The node it is about, when it is about one. */
  nodeId?: string;
  /** The prop it is about. */
  propKey?: string;
  /** How to fix it, when the vocabulary says. */
  hint?: string;
};

export const finding = (
  code: string,
  fields: DiagnosticFields = {},
  at: {nodeId?: string; propKey?: string} = {},
): BlokFinding => {
  const hint = diagnosticHint(code, fields);
  return {
    code,
    level: diagnosticLevel(code),
    message: diagnosticMessage(code, fields),
    ...(hint !== null ? {hint} : {}),
    ...(at.nodeId !== undefined ? {nodeId: at.nodeId} : {}),
    ...(at.propKey !== undefined ? {propKey: at.propKey} : {}),
  };
};

/**
 * The port kinds a control whose bind prop is `propKind` may write
 * (vocabulary `locals.bind_kinds`); null when it writes any (an `ANY` bind).
 */
export const bindKindsOf = (propKind: string): readonly string[] | null => loadVocabulary().locals.bindKinds[propKind] ?? null;

/** A local's kind for an untyped value (vocabulary `locals.any`): never an action port's, and checked against nothing. */
export const LOCAL_ANY_KIND = 'ANY';

/** Whether a control writing `propKind` may bind a local of port kind `localKind`; an ANY local takes any. */
export const bindFits = (propKind: string, localKind: string): boolean => {
  if (localKind === LOCAL_ANY_KIND) return true;
  const kinds = bindKindsOf(propKind);
  return kinds === null || kinds.includes(localKind);
};

/**
 * Whether a local of port kind `kind` (and `identifier`) may be passed whole as
 * an action's arg port (vocabulary `locals.arg_kinds`): the spec's
 * `check_arg_kinds`. A kind the table does not list takes any port; a
 * STRUCTURE fails only on two identifiers that differ.
 */
export const argFits = (
  local: {kind: string; identifier?: string | null},
  port: {kind: string; identifier?: string | null},
): boolean => {
  if (local.kind === LOCAL_ANY_KIND) return true;
  const kinds = loadVocabulary().locals.argKinds[local.kind];
  if (kinds && !kinds.includes(port.kind)) return false;
  const bothStructures = local.kind === 'STRUCTURE' && port.kind === 'STRUCTURE';
  return !(bothStructures && local.identifier != null && port.identifier != null && local.identifier !== port.identifier);
};
