import {
  analyzeBsx,
  BsxPrintError,
  localRootsOf,
  printBsx,
  viewCatalog,
  type BsxBlokContext,
} from "@/core/blok/bsx";
import { BsxEditor } from "@/core/blok/editor/BsxEditor";
import { defaultBlokCatalog } from "@/core/blok/renderer/catalog";
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
  ComponentContext,
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
  bsxDependency,
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

type EditorDraft = {
  name: string;
  description: string;
  context: ComponentContext;
  source: string;
  /** The demo state as JSON text. */
  demoState: string;
  dependencies: DependencyDraft[];
  /** The locals a renderer keeps on the device between openings. */
  persist: PersistDraft[];
};

type PersistDraft = { key: string; description: string };

const CONTEXT_LABEL: Record<ComponentContext, string> = {
  [ComponentContext.Html]: "Interface (HTML)",
  [ComponentContext.Scene]: "3D scene",
  [ComponentContext.Logo]: "Agent logo",
  [ComponentContext.ActionLogo]: "Action logo",
};

/** What a new blok of each context starts as. */
const STARTER: Record<ComponentContext, string> = {
  [ComponentContext.Html]: '<Card padding="4">\n  <CardContent>\n    <Text text="Hello" />\n  </CardContent>\n</Card>',
  [ComponentContext.Scene]: '<Scene height="24rem">\n</Scene>',
  [ComponentContext.Logo]: '<SVG viewBox="0 0 24 24" title="Logo">\n</SVG>',
  [ComponentContext.ActionLogo]: '<ActionLogo viewBox="0 0 24 24" title="Logo">\n</ActionLogo>',
};

const bsxContext = (context: ComponentContext): BsxBlokContext => context as unknown as BsxBlokContext;

const parseDemoState = (text: string): { value: Record<string, unknown> | null; error: string | null } => {
  if (!text.trim()) return { value: {}, error: null };
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { value: null, error: "The demo state is a JSON object." };
    return { value, error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : "Not JSON." };
  }
};

const DemoStateEditor = (props: { value: string; error: string | null; onChange: (value: string) => void }) => {
  const { resolvedTheme } = useTheme();
  return (
    <div className="flex h-full min-h-80 flex-col gap-2 p-3">
      <p className="text-xs text-muted-foreground">
        What the preview shows instead of agent state, and the blok's own state (a form's values): JSON, keyed by
        dependency.
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
          {Object.values(ComponentContext).map((context) => (
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

/**
 * Which of the blok's locals a renderer keeps on the device between openings
 * (`persist`): a local is a top-level key of the demo state that no
 * dependency and no arg takes, and its demo value is the default. The values
 * never reach the server.
 */
const PersistPanel = (props: {
  persist: PersistDraft[];
  locals: string[];
  onChange: (persist: PersistDraft[]) => void;
}) => {
  const kept = new Map(props.persist.map((local) => [local.key, local]));
  const gone = props.persist.filter((local) => !props.locals.includes(local.key));
  const toggle = (key: string, on: boolean) =>
    props.onChange(on ? [...props.persist, { key, description: "" }] : props.persist.filter((local) => local.key !== key));
  const describe = (key: string, description: string) =>
    props.onChange(props.persist.map((local) => (local.key === key ? { ...local, description } : local)));
  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Locals kept on the device between openings, e.g. a pose set once with a gizmo. Each starts as its demo value;
        what someone sets stays on their machine only, and <span className="font-mono">persist.reset(key)</span> forgets it.
      </p>
      {props.locals.length === 0 && gone.length === 0 ? (
        <p className="text-muted-foreground">The demo state has no locals: add a top-level key to keep one.</p>
      ) : null}
      {props.locals.map((key) => {
        const local = kept.get(key);
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox id={`persist-${key}`} checked={!!local} onCheckedChange={(on) => toggle(key, on === true)} />
              <Label htmlFor={`persist-${key}`} className="font-mono">
                {key}
              </Label>
            </div>
            {local ? (
              <Input
                value={local.description}
                placeholder="What is kept, for whoever resets it"
                onChange={(event) => describe(key, event.target.value)}
              />
            ) : null}
          </div>
        );
      })}
      {gone.map((local) => (
        <div key={local.key} className="flex items-center gap-2 text-destructive">
          <span className="flex-1">
            <span className="font-mono">{local.key}</span> is kept but is no longer a local of the demo state.
          </span>
          <Button size="sm" variant="ghost" onClick={() => toggle(local.key, false)}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
};

const persistInput = (persist: PersistDraft[]) =>
  persist.map((local) => ({ key: local.key, description: local.description.trim() || null }));

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
      Read in BSX as <span className="font-mono">@args.&lt;key&gt;</span>. Args are set where an app registers a blok;
      the server does not take them from the editor yet.
    </p>
  </div>
);

const Preview = (props: { blokId?: string; tree: BlokComponentNode | null; demoState: Record<string, unknown> }) => (
  <div className="h-full overflow-auto p-3">
    {props.tree ? (
      <ErrorBoundary
        resetKeys={[props.tree, props.demoState]}
        fallbackRender={({ error }) => (
          <ErrorNote error={error} title="The preview could not draw this" />
        )}
      >
        <DemoBlokRenderer
          surfaceId={`${props.blokId ?? "new"}-bsx-preview`}
          blok={{ id: props.blokId ?? "new", componentTree: [props.tree], demoState: props.demoState }}
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
  const demo = useMemo(() => parseDemoState(draft.demoState), [draft.demoState]);
  const lastDemo = useRef<Record<string, unknown>>({});
  if (demo.value) lastDemo.current = demo.value;

  const dependencies = useMemo(() => draft.dependencies.map(bsxDependency), [draft.dependencies]);
  const argKeys = useMemo(() => props.args.map((arg) => arg.key), [props.args]);
  const demoValue = demo.value ?? lastDemo.current;
  const localRoots = useMemo(() => localRootsOf(dependencies, demoValue), [dependencies, demoValue]);
  const context = bsxContext(draft.context);
  const locked = draft.dependencies.some((dependency) => dependency.locked);
  const problems = useMemo(() => dependencyProblems(draft.dependencies), [draft.dependencies]);
  const checkDependencies = dependenciesTouched || !props.blokId;
  const sendDependencies = checkDependencies && !locked;

  const analysis = useMemo(
    () => analyzeBsx(source, { catalog: defaultBlokCatalog, context, references: { dependencies, args: argKeys, localRoots } }),
    [source, context, dependencies, argKeys, localRoots],
  );
  // The preview keeps the last tree that parsed while the author is mid-word.
  const lastTree = useRef<BlokComponentNode | null>(null);
  if (analysis.tree) lastTree.current = analysis.tree;

  const parses = analysis.tree !== null && source === draft.source;
  const editInput = useCallback(
    (base: string | null) => ({
      blok: props.blokId!,
      // A provided blok has no revisions: its first save forks it.
      base: props.provided ? null : base,
      source: draft.source,
      demoState: demo.value ?? {},
      persist: persistInput(draft.persist),
      ...(sendDependencies ? { dependencies: draft.dependencies.map(dependencyInput) } : {}),
    }),
    [props.blokId, props.provided, draft.source, draft.dependencies, draft.persist, demo.value, sendDependencies],
  );
  // The blok's own top-level keys, but the root its args are read under: what it can keep.
  const locals = useMemo(() => localRoots.filter((key) => key !== "args"), [localRoots]);

  // What the server makes of the draft, once it parses here and the blok exists.
  const check = useServerCheck(
    props.blokId && analysis.tree && demo.value && !(checkDependencies && problems.size > 0)
      ? { ...editInput(head?.id ?? null), source }
      : null,
  );

  const environment = useMemo(
    () => ({ catalog: viewCatalog(defaultBlokCatalog), context, dependencies, args: argKeys, localRoots }),
    [context, dependencies, argKeys, localRoots],
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
  const blocked = !draft.name.trim() || !parses || demo.value === null || (checkDependencies && problems.size > 0);
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
              demoState: demo.value ?? {},
              dependencies: draft.dependencies.map(dependencyInput),
              persist: persistInput(draft.persist),
            },
          },
        });
        if (data) navigate(RekuestBlok.linkBuilder(data.createBlok.id));
        return;
      }

      const contentChanged =
        draft.source !== saved.source ||
        draft.demoState !== saved.demoState ||
        JSON.stringify(draft.persist) !== JSON.stringify(saved.persist) ||
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
                  title={!parses ? "Fix the source first" : demo.value === null ? "Fix the demo state first" : undefined}
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
          <Sidebars.Tab label="Demo state">
            <DemoStateEditor value={draft.demoState} error={demo.error} onChange={(demoState) => change({ demoState })} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Kept">
            <PersistPanel persist={draft.persist} locals={locals} onChange={(persist) => change({ persist })} />
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
                <BsxEditor value={draft.source} onChange={(next) => change({ source: next })} environment={environment} markers={markers} />
              </div>
              {SERVER_STATUS[check.status] && (
                <div className="shrink-0 border-t px-3 py-1 text-xs text-muted-foreground">{SERVER_STATUS[check.status]}</div>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={20}>
            <Preview blokId={props.blokId} tree={lastTree.current} demoState={lastDemo.current} />
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
      demoState: "{}",
      dependencies: [],
      persist: [],
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
            demoState: JSON.stringify(blok.demoState ?? {}, null, 2),
            dependencies: blok.dependencies.map(dependencyDraft),
            persist: blok.persist.map((local) => ({ key: local.key, description: local.description ?? "" })),
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
      args={blok.args}
      onReload={reload}
    />
  );
};

/** An existing blok, printed back to BSX: the server keeps the tree, not the text. */
export const EditBlokEditorPage = asDetailQueryRoute(useBlokEditorQuery, ({ data, refetch }) => (
  <EditorFor blok={data.blok} refetch={refetch} />
));
