import {
  analyzeBsx,
  blokContextOf,
  blokRootOf,
  BsxPrintError,
  emptyBlokScope,
  parseBsxPartial,
  printBsx,
  type BlokCheckScope,
} from "@/core/blok/bsx";
import { BsxEditor } from "@/core/blok/editor/BsxEditor";
import type { BlokComponentNode } from "@/core/blok/renderer/runtime/types";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestBlok } from "@/core/linkers";
import { useTheme } from "@/core/settings/theme/ThemeProvider";
import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { PageAction } from "@/core/ui/page-action";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/core/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Textarea } from "@/core/ui/textarea";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { Editor } from "@monaco-editor/react";
import { Code, GitFork } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useNavigate } from "react-router-dom";
import {
  ArgPortFragment,
  ResolvedBlokLocalFragment,
  ComponentContext,
  LocalKind,
  useBlokEditorLazyQuery,
  useBlokEditorQuery,
  useCreateEditorBlokMutation,
  useEditBlokMutation,
  useUpdateEditorBlokMutation,
  type BlokEditorFragment,
} from "../api/graphql";
import { ArgPortRows, SignatureColumn } from "../components/action/ActionSignature";
import DemoBlokRenderer from "../components/DemoBlokRenderer";
import {
  scopeDependency,
  dependencyDraft,
  dependencyInput,
  dependencyProblems,
  type DependencyDraft,
} from "../components/editor/blokDependencies";
import { BlokHistory } from "../components/editor/BlokHistory";
import { DependencyListEditor } from "../components/editor/DependencyListEditor";
import { diagnosticMarkers, refusalMarkers } from "../components/editor/serverMarkers";
import { useServerCheck, type ServerCheck } from "../components/editor/useServerCheck";
import { REKUEST_HELP } from "../help";
import {
  buildDeclarations,
  declarationsDraft,
  draftResolvedLocals,
  emptyDeclarationsDraft,
  inferredLocalKinds,
  type DeclarationsDraft,
  LOCAL_KINDS,
  newLocalDraft,
  type LocalDraft,
  type ReadDraft,
} from "../components/editor/blokDeclarationsDraft";
import type { BlokDeclaredLocal, BlokDeclarations } from "@/core/blok/renderer/declarations";

type EditorDraft = {
  name: string;
  description: string;
  context: ComponentContext;
  source: string;
  dependencies: DependencyDraft[];
  /** Locals, reads and the demo: what the blok declares beside its tree. */
  declarations: DeclarationsDraft;
};

/** The blok language a save writes. */
const VOCAB = 2;

const CONTEXT_LABEL: Record<ComponentContext, string> = {
  [ComponentContext.Html]: "Interface (HTML)",
  [ComponentContext.Scene]: "3D scene",
  [ComponentContext.Logo]: "Agent logo",
  [ComponentContext.ActionLogo]: "Action logo",
  [ComponentContext.Overlay]: "Run overlay",
};

/** A starter under the root component that names `context` (`<Html>`, `<Scene>`, `<AgentLogo>`, ...). */
const starter = (context: ComponentContext, attributes: string, body: string): string => {
  const root = blokRootOf(String(context)) ?? String(context);
  return `<${root}${attributes}>\n${body}</${root}>`;
};

/** What a new blok of each context starts as. */
const STARTER: Record<ComponentContext, string> = {
  [ComponentContext.Html]: starter(
    ComponentContext.Html,
    "",
    '  <Card className="p-4">\n    <CardContent>\n      <Text>Hello</Text>\n    </CardContent>\n  </Card>\n',
  ),
  [ComponentContext.Scene]: starter(ComponentContext.Scene, ' height="24rem"', ""),
  [ComponentContext.Logo]: starter(ComponentContext.Logo, ' viewBox="0 0 24 24" title="Logo"', ""),
  [ComponentContext.ActionLogo]: starter(ComponentContext.ActionLogo, ' viewBox="0 0 24 24" title="Logo"', ""),
  [ComponentContext.Overlay]: starter(ComponentContext.Overlay, "", ""),
};

/** The first tag of a source: its root component, read without parsing the rest. */
const ROOT_TAG = /^\s*(?:<!--[\s\S]*?-->\s*)*<([A-Za-z][\w.]*)/;

/** The context a source's root names, if it is a blok root this editor makes. */
const rootContext = (source: string): ComponentContext | null => {
  const tag = ROOT_TAG.exec(source)?.[1];
  const context = tag ? blokContextOf(tag) : null;
  return context && (EDITABLE_CONTEXTS as string[]).includes(context) ? (context as ComponentContext) : null;
};

/** An overlay is an action's own blok, declared with the action: never made here. */
const EDITABLE_CONTEXTS = Object.values(ComponentContext).filter((context) => context !== ComponentContext.Overlay);

const bsxContext = (context: ComponentContext): string => String(context);

const DemoEditor = (props: { value: string; error: string | null; onChange: (value: string) => void }) => {
  const { resolvedTheme } = useTheme();
  return (
    <div className="flex h-full min-h-80 flex-col gap-2 p-3">
      <p className="text-xs text-muted-foreground">
        What the preview shows, mirroring what the blok reads: JSON{" "}
        <span className="font-mono">{"{deps, args, task, queries, subscriptions}"}</span>, e.g.{" "}
        <span className="font-mono">{'{"deps": {"robot": {"arm": {"mode": "idle"}}}}'}</span>. Locals start at their
        defaults.
      </p>
      <div className="min-h-64 flex-1 overflow-hidden rounded-md border">
        <Editor
          language="json"
          value={props.value}
          onChange={(value) => props.onChange(value ?? "")}
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
          options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }}
        />
      </div>
      {props.error && <p className="text-xs text-destructive">{props.error}</p>}
    </div>
  );
};

const DetailsPanel = (props: {
  draft: EditorDraft;
  contextLocked: boolean;
  onChange: (patch: Partial<EditorDraft>) => void;
}) => (
  <div className="flex flex-col gap-3 p-3">
    <div className="flex flex-col gap-1">
      <Label htmlFor="blok-name">Name</Label>
      <Input id="blok-name" value={props.draft.name} onChange={(event) => props.onChange({ name: event.target.value })} />
    </div>
    <div className="flex flex-col gap-1">
      <Label htmlFor="blok-description">Description</Label>
      <Textarea
        id="blok-description"
        value={props.draft.description}
        rows={3}
        onChange={(event) => props.onChange({ description: event.target.value })}
      />
    </div>
    <div className="flex flex-col gap-1">
      <Label>Renders as</Label>
      <Select
        value={props.draft.context}
        disabled={props.contextLocked}
        onValueChange={(value) => {
          const context = value as ComponentContext;
          // A fresh starter follows the context; text the author wrote stays.
          const untouched = props.draft.source === STARTER[props.draft.context];
          props.onChange({ context, ...(untouched ? { source: STARTER[context] } : {}) });
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDITABLE_CONTEXTS.map((context) => (
            <SelectItem key={context} value={context}>
              {CONTEXT_LABEL[context]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {props.contextLocked && <p className="text-xs text-muted-foreground">Chosen when the blok was made.</p>}
    </div>
  </div>
);

const ProblemLine = ({ problem }: { problem: string | undefined }) =>
  problem ? <p className="text-xs text-destructive">{problem}</p> : null;

const NO_CHOICES_KINDS: ReadonlySet<string | null> = new Set([
  LocalKind.Bool,
  LocalKind.List,
  LocalKind.Dict,
  LocalKind.Model,
  LocalKind.Structure,
  LocalKind.Any,
]);
/** The Select's value for a local that says no kind (a Select item cannot hold an empty value). */
const INFERRED_KIND = "inferred";

/**
 * The blok's locals: form state that feeds a call, written only through
 * `bind` on a control (`<Slider bind={iterations} />`), read bare. A local is
 * a port, typed like an action's argument: the kind says which controls may
 * bind it (a Slider writes FLOAT, a Switch BOOL, an Input STRING) and which
 * action ports it may be passed to. `persist` keeps the last input on this
 * device between openings (never on a server).
 */
const LocalsPanel = (props: {
  locals: LocalDraft[];
  problems: ReadonlyMap<string, string>;
  /** The kind each local that says none takes from the tree, by key. */
  inferred?: ReadonlyMap<string, string>;
  onChange: (locals: LocalDraft[]) => void;
}) => {
  const update = (index: number, patch: Partial<LocalDraft>) =>
    props.onChange(props.locals.map((local, at) => (at === index ? { ...local, ...patch } : local)));
  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Form state that feeds a call, each a port: bound to a control with <span className="font-mono">bind={"{name}"}</span>,
        read bare (<span className="font-mono">{"{name}"}</span>). Its kind says which controls may bind it and which action
        ports it may be passed to. Nothing else writes a local.
      </p>
      {props.locals.map((local, index) => (
        <div key={index} className="flex flex-col gap-1 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <Input
              aria-label="Name"
              className="font-mono"
              value={local.key}
              placeholder="iterations"
              onChange={(event) => update(index, { key: event.target.value })}
            />
            <Select
              value={local.kind ?? INFERRED_KIND}
              onValueChange={(value) => update(index, { kind: LOCAL_KINDS.find((kind) => kind === value) ?? null })}
            >
              <SelectTrigger aria-label="Kind" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INFERRED_KIND}>
                  {props.inferred?.get(local.key) ? `inferred: ${props.inferred.get(local.key)}` : "no kind (inferred / ANY)"}
                </SelectItem>
                {LOCAL_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => props.onChange(props.locals.filter((_, at) => at !== index))}>
              Remove
            </Button>
          </div>
          {local.kind === LocalKind.Structure || local.kind === LocalKind.Model || local.kind === LocalKind.Enum ? (
            <Input
              aria-label="Identifier"
              className="font-mono"
              value={local.identifier}
              placeholder={local.kind === LocalKind.Structure ? "@mikro/image" : "identifier (optional)"}
              onChange={(event) => update(index, { identifier: event.target.value })}
            />
          ) : null}
          <Input
            aria-label="Default"
            className="font-mono"
            value={local.defaultText}
            placeholder="Its default, as JSON: 15"
            onChange={(event) => update(index, { defaultText: event.target.value })}
          />
          {NO_CHOICES_KINDS.has(local.kind) ? null : (
            <Input
              aria-label="Choices"
              className="font-mono"
              value={local.choicesText}
              placeholder={local.kind === LocalKind.Enum ? 'Choices: [{"value": "fast", "label": "Fast"}]' : "Choices (optional), as JSON"}
              onChange={(event) => update(index, { choicesText: event.target.value })}
            />
          )}
          <div className="flex items-center gap-2">
            <Input aria-label="Label" value={local.label} placeholder="Label" onChange={(event) => update(index, { label: event.target.value })} />
            <Input
              aria-label="Description"
              value={local.description}
              placeholder="Description"
              onChange={(event) => update(index, { description: event.target.value })}
            />
          </div>
          {local.children?.length ? (
            <p className="text-xs text-muted-foreground">
              Fields: <span className="font-mono">{local.children.map((child) => `${child.key}: ${child.kind}`).join(", ")}</span> (kept as
              declared)
            </p>
          ) : null}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id={`nullable-${index}`} checked={local.nullable} onCheckedChange={(on) => update(index, { nullable: on === true })} />
              <Label htmlFor={`nullable-${index}`}>nullable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id={`persist-${index}`} checked={local.persist} onCheckedChange={(on) => update(index, { persist: on === true })} />
              <Label htmlFor={`persist-${index}`}>keep on this device</Label>
            </div>
          </div>
          <ProblemLine problem={props.problems.get(`local:${local.key}`)} />
        </div>
      ))}
      <Button size="sm" variant="outline" className="self-start" onClick={() => props.onChange([...props.locals, newLocalDraft()])}>
        Add a local
      </Button>
    </div>
  );
};

/**
 * The read side: declared GraphQL queries and subscriptions, read as
 * `queries.<name>` / `subscriptions.<name>`. Reads only: a mutation is
 * refused. Variables are expressions over args, locals and dependencies, and
 * re-run the read when they change.
 */
const ReadsPanel = (props: {
  reads: ReadDraft[];
  problems: ReadonlyMap<string, string>;
  onChange: (reads: ReadDraft[]) => void;
}) => {
  const update = (index: number, patch: Partial<ReadDraft>) =>
    props.onChange(props.reads.map((read, at) => (at === index ? { ...read, ...patch } : read)));
  const add = (kind: ReadDraft["kind"]) =>
    props.onChange([
      ...props.reads,
      {
        kind,
        key: "",
        service: "",
        document: kind === "query" ? "query {\n}" : "subscription {\n}",
        variables: [],
        poll: "",
        more: "",
        keep: "",
        history: "",
      },
    ]);
  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <p className="text-xs text-muted-foreground">
        What the blok reads from services: <span className="font-mono">queries.&lt;name&gt;</span>{" "}
        <span className="font-mono">{"{status, value, error, refetching, fetching_more}"}</span> and{" "}
        <span className="font-mono">subscriptions.&lt;name&gt;</span>. A button re-reads a query with{" "}
        <span className="font-mono">{"onClick={queries.<name>.refetch()}"}</span>, or reads its next page with{" "}
        <span className="font-mono">{"queries.<name>.fetch_more(after: …)"}</span> when it names the list field new pages
        append to (more). To read the moment being viewed while time-travelling, pass{" "}
        <span className="font-mono">then</span> as a variable; subscriptions pause then, replaying their history query.
      </p>
      {props.reads.map((read, index) => (
        <div key={index} className="flex flex-col gap-1 rounded-md border p-2">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">{read.kind}</span>
            <Input aria-label="Name" className="font-mono" value={read.key} placeholder="positions" onChange={(event) => update(index, { key: event.target.value })} />
            <Input aria-label="Service" className="w-28" value={read.service} placeholder="mikro" onChange={(event) => update(index, { service: event.target.value })} />
            <Button size="sm" variant="ghost" onClick={() => props.onChange(props.reads.filter((_, at) => at !== index))}>
              Remove
            </Button>
          </div>
          <Textarea
            aria-label="Document"
            className="font-mono text-xs"
            rows={4}
            value={read.document}
            onChange={(event) => update(index, { document: event.target.value })}
          />
          {read.variables.map((variable, variableIndex) => (
            <div key={variableIndex} className="flex items-center gap-2">
              <Input
                aria-label="Variable"
                className="w-28 font-mono"
                value={variable.key}
                placeholder="slide"
                onChange={(event) =>
                  update(index, {
                    variables: read.variables.map((other, at) => (at === variableIndex ? { ...other, key: event.target.value } : other)),
                  })
                }
              />
              <Input
                aria-label="Expression"
                className="font-mono"
                value={variable.expression}
                placeholder="args.slide.id"
                onChange={(event) =>
                  update(index, {
                    variables: read.variables.map((other, at) => (at === variableIndex ? { ...other, expression: event.target.value } : other)),
                  })
                }
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update(index, { variables: read.variables.filter((_, at) => at !== variableIndex) })}
              >
                ×
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => update(index, { variables: [...read.variables, { key: "", expression: "" }] })}>
              Add a variable
            </Button>
            {read.kind === "query" ? (
              <>
                <Input aria-label="Poll" className="w-24" value={read.poll} placeholder="poll (s)" onChange={(event) => update(index, { poll: event.target.value })} />
                <Input aria-label="More" className="w-36 font-mono" value={read.more} placeholder="more: positions.items" onChange={(event) => update(index, { more: event.target.value })} />
              </>
            ) : (
              <>
                <Input aria-label="Keep" className="w-24" value={read.keep} placeholder="keep" onChange={(event) => update(index, { keep: event.target.value })} />
                <Input aria-label="History" className="w-28" value={read.history} placeholder="history query" onChange={(event) => update(index, { history: event.target.value })} />
              </>
            )}
          </div>
          <ProblemLine problem={props.problems.get(`${read.kind}:${read.key}`)} />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => add("query")}>
          Add a query
        </Button>
        <Button size="sm" variant="outline" onClick={() => add("subscription")}>
          Add a subscription
        </Button>
      </div>
    </div>
  );
};

const ArgsPanel = ({ args }: { args: ArgPortFragment[] }) => (
  <div className="flex flex-col gap-2 p-3 text-sm">
    {args.length > 0 ? (
      <SignatureColumn title="Opened for">
        <ArgPortRows ports={args} />
      </SignatureColumn>
    ) : (
      <p className="text-muted-foreground">It is opened on its own, for no item.</p>
    )}
    <p className="text-xs text-muted-foreground">
      Read in BSX as <span className="font-mono">args.&lt;key&gt;</span>. Args are set where an app registers a blok;
      the server does not take them from the editor yet.
    </p>
  </div>
);

const Preview = (props: { blokId?: string; tree: BlokComponentNode | null; declarations: BlokDeclarations }) => (
  <div className="h-full overflow-auto p-3">
    {props.tree ? (
      <ErrorBoundary
        resetKeys={[props.tree, props.declarations]}
        fallbackRender={({ error }) => (
          <ErrorNote error={error} title="The preview could not draw this" />
        )}
      >
        <DemoBlokRenderer
          surfaceId={`${props.blokId ?? "new"}-bsx-preview`}
          blok={{ id: props.blokId ?? "new", componentTree: [props.tree], ...props.declarations }}
          debug
        />
      </ErrorBoundary>
    ) : (
      <p className="text-sm text-muted-foreground">The preview shows once the source parses.</p>
    )}
  </div>
);

const SERVER_STATUS: Record<ServerCheck["status"], string> = {
  idle: "",
  checking: "Server: checking…",
  ok: "Server: checked",
  warnings: "Server: checked, with warnings",
  refused: "Server: refused",
};

/** The head as the editor last knew it: what a save names as `base`. */
type Head = { id: string; number: number } | null;

/**
 * Writing a blok in BSX: the source with completion from the catalog and
 * what the blok declares, a live preview against the demo state, and its
 * details, demo state, dependencies, args and history beside. The client
 * parses to preview and mark; the server checks the draft after a pause
 * (`editBlok` with `dryRun`) and a save is one new revision on the head the
 * editor read (`base`), refused once someone saved on top of it. A blok an
 * app provides is forked by its first save.
 */
const BlokEditorWorkspace = (props: {
  blokId?: string;
  provided?: boolean;
  head?: Head;
  initial: EditorDraft;
  /** The locals as the server resolved them when the blok was loaded (never sent back). */
  resolvedLocals?: ReadonlyArray<ResolvedBlokLocalFragment>;
  args: ArgPortFragment[];
  title: string;
  /** Load the blok again from the server (after a restore, or to take the head someone else saved). */
  onReload?: () => void;
}) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(props.initial);
  const [saved, setSaved] = useState(props.initial);
  const [head, setHead] = useState<Head>(props.head ?? null);
  const [conflict, setConflict] = useState<Head>(null);
  const [message, setMessage] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [dependenciesTouched, setDependenciesTouched] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [create, { loading: creating }] = useCreateEditorBlokMutation({ refetchQueries: ["ListBloks"] });
  const [edit, { loading: editing }] = useEditBlokMutation({ refetchQueries: ["GetBlok", "BlokRevisions"] });
  const [updateDetails, { loading: updating }] = useUpdateEditorBlokMutation({ refetchQueries: ["GetBlok"] });
  const [fetchHead] = useBlokEditorLazyQuery({ fetchPolicy: "network-only" });
  const change = (patch: Partial<EditorDraft>) => {
    setSaveError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const source = useDebounce(draft.source, 200);
  const declarations = useMemo(() => buildDeclarations(draft.declarations), [draft.declarations]);
  const valid = declarations.problems.size === 0;

  const dependencies = useMemo(() => draft.dependencies.map(scopeDependency), [draft.dependencies]);
  const argKeys = useMemo(() => props.args.map((arg) => arg.key), [props.args]);
  const context = bsxContext(draft.context);
  const scope = useMemo(
    (): BlokCheckScope => ({
      ...emptyBlokScope(draft.context === ComponentContext.ActionLogo ? "action_logo" : "custom", context),
      dependencies,
      ...declarations.scope,
      args: argKeys,
    }),
    [context, declarations.scope, dependencies, argKeys, draft.context],
  );
  const locked = draft.dependencies.some((dependency) => dependency.locked);
  const problems = useMemo(() => dependencyProblems(draft.dependencies), [draft.dependencies]);
  const checkDependencies = dependenciesTouched || !props.blokId;
  const sendDependencies = checkDependencies && !locked;

  const analysis = useMemo(
    () => analyzeBsx(source, { scope }),
    [source, scope],
  );
  // Mid-word, the preview draws as far as the source goes (its completed prefix); only
  // where not even that parses does it keep the last tree that did.
  const previewTree = useMemo(
    () => analysis.tree ?? parseBsxPartial(source).tree,
    [analysis.tree, source],
  );
  const lastTree = useRef<BlokComponentNode | null>(null);
  if (previewTree) lastTree.current = previewTree;

  const parses = analysis.tree !== null && source === draft.source;
  const declared = useMemo(
    () => ({
      vocab: VOCAB,
      locals: declarations.locals,
      demo: declarations.demo,
      queries: declarations.queries,
      subscriptions: declarations.subscriptions,
    }),
    [declarations],
  );
  const editInput = useCallback(
    (base: string | null) => ({
      blok: props.blokId!,
      // A provided blok has no revisions: its first save forks it.
      base: props.provided ? null : base,
      source: draft.source,
      ...declared,
      ...(sendDependencies ? { dependencies: draft.dependencies.map(dependencyInput) } : {}),
    }),
    [props.blokId, props.provided, draft.source, draft.dependencies, declared, sendDependencies],
  );

  // What the server makes of the draft, once it parses here and the blok exists.
  const checkInput =
    props.blokId && analysis.tree && valid && !(checkDependencies && problems.size > 0) ? { ...editInput(head?.id ?? null), source } : null;
  const check = useServerCheck(checkInput);
  const checkKey = checkInput === null ? null : JSON.stringify(checkInput);

  // The draft's locals as its tree resolves them: the server's dry run once it answered
  // this very draft, else the local validator's (they resolve the same way).
  const resolvedLocals = useMemo(
    () =>
      draftResolvedLocals<BlokDeclaredLocal>(
        analysis.resolved?.locals ?? null,
        check.status === "ok" || check.status === "warnings" ? check : null,
        checkKey,
      ),
    [analysis.resolved, check, checkKey],
  );
  // What the tree gives the locals that say no kind, shown beside them; while the source
  // does not parse, what the server resolved when the blok was loaded.
  const inferredKinds = useMemo(() => inferredLocalKinds(resolvedLocals, props.resolvedLocals), [resolvedLocals, props.resolvedLocals]);
  // The preview keeps the last declarations that held while the author is mid-edit. It
  // types the locals as the tree resolves them, never as written (a kind may be left out).
  const lastDeclarations = useRef<BlokDeclarations>({ resolvedLocals: [] });
  if (valid && resolvedLocals) {
    lastDeclarations.current = {
      vocab: VOCAB,
      resolvedLocals,
      demo: declarations.demo,
      queries: declarations.scope.queries.map((query) => ({ ...query, service: query.service ?? "", document: query.document ?? "" })),
      subscriptions: declarations.scope.subscriptions.map((read) => ({ ...read, service: read.service ?? "", document: read.document ?? "" })),
    };
  }

  const environment = useMemo(
    () => ({ scope }),
    [scope],
  );
  const markers = useMemo(
    () => [
      ...analysis.markers,
      ...(check.status === "warnings" ? diagnosticMarkers(check.diagnostics, draft.source) : []),
      ...(check.status === "refused" && !saveError ? refusalMarkers(check.error, draft.source) : []),
      ...refusalMarkers(saveError, draft.source),
    ],
    [analysis.markers, check, saveError, draft.source],
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const blocked = !draft.name.trim() || !parses || !valid || (checkDependencies && problems.size > 0);
  const saving = creating || editing || updating;

  const save = async (base: string | null = head?.id ?? null) => {
    setSaveError(null);
    setMessageOpen(false);
    try {
      if (!props.blokId) {
        const { data } = await create({
          variables: {
            input: {
              name: draft.name.trim(),
              description: draft.description.trim() || null,
              context: draft.context,
              source: draft.source,
              ...declared,
              dependencies: draft.dependencies.map(dependencyInput),
            },
          },
        });
        if (data) navigate(RekuestBlok.linkBuilder(data.createBlok.id));
        return;
      }

      const contentChanged =
        draft.source !== saved.source ||
        JSON.stringify(draft.declarations) !== JSON.stringify(saved.declarations) ||
        dependenciesTouched ||
        props.provided;
      let target = props.blokId;
      if (contentChanged) {
        const { data } = await edit({ variables: { input: { ...editInput(base), message: message.trim() || null } } });
        if (!data) return;
        target = data.editBlok.blok.id;
        if (data.editBlok.revision) setHead({ id: data.editBlok.revision.id, number: data.editBlok.revision.number });
      }
      if (draft.name !== saved.name || draft.description !== saved.description) {
        await updateDetails({
          variables: { input: { id: target, name: draft.name.trim(), description: draft.description.trim() || null } },
        });
      }
      if (target !== props.blokId) {
        // The first save of a provided blok made a copy: edit that from now on.
        navigate(`${RekuestBlok.linkBuilder(target)}/edit`);
        return;
      }
      setSaved(draft);
      setMessage("");
      setConflict(null);
      setDependenciesTouched(false);
    } catch (error) {
      setSaveError(error);
      // Refused because someone saved on top of the head this draft started from?
      if (props.blokId && !props.provided) {
        const { data } = await fetchHead({ variables: { id: props.blokId } });
        const now = data?.blok.head;
        if (now && now.id !== base) setConflict({ id: now.id, number: now.number });
      }
    }
  };

  const saveLabel = !props.blokId
    ? "Create blok"
    : props.provided
      ? "Save as my copy"
      : dirty
        ? "Save"
        : head
          ? `Saved · rev ${head.number}`
          : "Saved";

  return (
    <PageLayout
      title={props.title}
      help={REKUEST_HELP.blokEditor}
      pageActions={
        <>
          {props.blokId && (
            <PageAction size="sm" variant="ghost" onClick={() => navigate(RekuestBlok.linkBuilder(props.blokId!))}>
              Open blok
            </PageAction>
          )}
          <PageAction.Slot alwaysShow>
            <Popover open={messageOpen} onOpenChange={setMessageOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  disabled={blocked || saving || (!!props.blokId && !props.provided && !dirty)}
                  title={!parses ? "Fix the source first" : !valid ? [...declarations.problems.values()][0] : undefined}
                >
                  {saveLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="flex w-80 flex-col gap-2">
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                  }}
                >
                  <Label htmlFor="revision-message">What changed?</Label>
                  <Input
                    id="revision-message"
                    autoFocus
                    value={message}
                    placeholder="Optional, kept with the revision"
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <Button type="submit" size="sm" className="self-end" disabled={saving}>
                    {props.blokId ? "Save revision" : "Create blok"}
                  </Button>
                </form>
              </PopoverContent>
            </Popover>
          </PageAction.Slot>
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Details">
            <DetailsPanel draft={draft} contextLocked={!!props.blokId} onChange={change} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Dependencies">
            <DependencyListEditor
              dependencies={draft.dependencies}
              problems={checkDependencies ? problems : new Map()}
              disabled={locked}
              onChange={(next) => {
                setDependenciesTouched(true);
                change({ dependencies: next });
              }}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Locals">
            <LocalsPanel
              locals={draft.declarations.locals}
              problems={declarations.problems}
              inferred={inferredKinds}
              onChange={(locals) => change({ declarations: { ...draft.declarations, locals } })}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Reads">
            <ReadsPanel
              reads={draft.declarations.reads}
              problems={declarations.problems}
              onChange={(reads) => change({ declarations: { ...draft.declarations, reads } })}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Demo">
            <DemoEditor
              value={draft.declarations.demo}
              error={declarations.problems.get("demo") ?? null}
              onChange={(demo) => change({ declarations: { ...draft.declarations, demo } })}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Args">
            <ArgsPanel args={props.args} />
          </Sidebars.Tab>
          {props.blokId && !props.provided ? (
            <Sidebars.Tab label="History">
              <BlokHistory blokId={props.blokId} dirty={dirty} onRestored={props.onReload} />
            </Sidebars.Tab>
          ) : null}
        </Sidebars>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {props.provided && (
          <div className="flex items-center gap-2 border-b px-3 py-2 text-sm text-muted-foreground">
            <GitFork className="size-4 shrink-0" />
            Its app's agents keep this blok. Saving makes a copy of your own, which you edit from then on.
          </div>
        )}
        {conflict && (
          <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <span className="flex-1">Revision {conflict.number} was saved meanwhile, so this draft no longer starts from the latest.</span>
            <Button size="sm" variant="outline" onClick={() => void save(conflict.id)}>
              Save on top
            </Button>
            <Button size="sm" variant="ghost" onClick={props.onReload}>
              Load it
            </Button>
          </div>
        )}
        {saveError && !conflict ? (
          <ErrorNote error={saveError} title="Couldn't save the blok" variant="line" className="px-3 py-2" />
        ) : null}
        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={55} minSize={25}>
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <BsxEditor
                  value={draft.source}
                  onChange={(next) => {
                    // The root names the context: a new blok's follows it; a saved one's is fixed (context.root marks a mismatch).
                    const named = props.blokId ? null : rootContext(next);
                    change({ source: next, ...(named && named !== draft.context ? { context: named } : {}) });
                  }}
                  environment={environment}
                  markers={markers}
                />
              </div>
              {SERVER_STATUS[check.status] && (
                <div className="shrink-0 border-t px-3 py-1 text-xs text-muted-foreground">{SERVER_STATUS[check.status]}</div>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={20}>
            <Preview blokId={props.blokId} tree={lastTree.current} declarations={lastDeclarations.current} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </PageLayout>
  );
};

/** A new custom blok, from a starter. */
export const NewBlokEditorPage = () => (
  <BlokEditorWorkspace
    title="New Blok"
    args={[]}
    initial={{
      name: "",
      description: "",
      context: ComponentContext.Html,
      source: STARTER[ComponentContext.Html],
      dependencies: [],
      declarations: emptyDeclarationsDraft(),
    }}
  />
);

const EditorFor = ({ blok, refetch }: { blok: BlokEditorFragment; refetch: () => Promise<unknown> }) => {
  // Bumped to start over from what the server holds now.
  const [generation, setGeneration] = useState(0);
  const reload = useCallback(() => {
    void refetch().then(() => setGeneration((current) => current + 1));
  }, [refetch]);

  const printed = useMemo(() => {
    const roots = (blok.componentTree ?? []) as BlokComponentNode[];
    if (roots.length !== 1) return { error: `BSX holds one root; this blok has ${roots.length}.` };
    try {
      return { source: printBsx(roots[0]) };
    } catch (error) {
      if (error instanceof BsxPrintError) return { error: error.message };
      throw error;
    }
  }, [blok.componentTree]);
  const initial = useMemo<EditorDraft | null>(
    () =>
      printed.source === undefined
        ? null
        : {
            name: blok.name,
            description: blok.description ?? "",
            context: blok.context,
            source: printed.source,
            dependencies: blok.dependencies.map(dependencyDraft),
            declarations: declarationsDraft(blok),
          },
    // Read once per generation: the cache moving under a draft must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blok.id, generation, printed.source === undefined],
  );

  if (!initial) {
    return (
      <PageLayout title={`Edit ${blok.name}`} help={REKUEST_HELP.blokEditor}>
        <StatusPage
          variant="compact"
          icon={Code}
          tone="warning"
          title="This blok can't be written as BSX"
          description="Its tree holds something BSX has no spelling for, so opening it as text would change it on the next save."
          technical={printed.error ?? null}
        />
      </PageLayout>
    );
  }
  return (
    <BlokEditorWorkspace
      key={`${blok.id}:${generation}`}
      blokId={blok.id}
      provided={blok.provided}
      head={blok.head ?? null}
      title={`Edit ${blok.name}`}
      initial={initial}
      resolvedLocals={blok.resolvedLocals}
      args={blok.args}
      onReload={reload}
    />
  );
};

/** An existing blok, printed back to BSX: the server keeps the tree, not the text. */
export const EditBlokEditorPage = asDetailQueryRoute(useBlokEditorQuery, ({ data, refetch }) => (
  <EditorFor blok={data.blok} refetch={refetch} />
));
