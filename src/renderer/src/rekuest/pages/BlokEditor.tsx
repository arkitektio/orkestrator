import {
  analyzeBsx,
  blokHeader,
  BsxPrintError,
  mountedBlokScope,
  parseBsxPartial,
  printBsx,
  type BlokCheckScope,
} from "@arkitektio/bsx/bsx/index";
import { BsxEditor } from "@arkitektio/bsx/editor/BsxEditor";
import type { BlokComponentNode } from "@arkitektio/bsx/renderer/runtime/types";
import { useDialog } from "@/core/dialogs/registry";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { PageLayout } from "@/core/layout/PageLayout";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { RekuestBlok } from "@/core/linkers";
import { useTheme } from "@/core/settings/theme/ThemeProvider";
import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { PageAction } from "@/core/ui/page-action";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/core/ui/resizable";
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
import { BLOK_CONTEXTS } from "../components/blokContexts";
import {
  buildDeclarations,
  declarationsDraft,
  draftResolvedLocals,
  emptyDeclarationsDraft,
  type DeclarationsDraft,
} from "../components/editor/blokDeclarationsDraft";
import type { BlokDeclaredLocal, BlokDeclarations } from "@arkitektio/bsx/renderer/declarations";

type EditorDraft = {
  name: string;
  description: string;
  /** The BSX: its `<Blok kind context>` says what it is, its `<local>`/`<query>`/`<subscription>` what it owns. */
  source: string;
  dependencies: DependencyDraft[];
  /** The demo: what the blok declares beside its tree. */
  declarations: DeclarationsDraft;
};

/** The blok language a save writes. */
const VOCAB = 2;

/** What a new custom blok starts as: a panel. */
const STARTER =
  '<Blok kind="custom" context="panel">\n  <Card className="p-4">\n    <CardContent>\n      <Text>Hello</Text>\n    </CardContent>\n  </Card>\n</Blok>\n';

/** The kind every blok made or saved here is: a provided blok's first save forks it into a custom one. */
const CUSTOM_KIND = "custom";


const DemoEditor = (props: { value: string; error: string | null; onChange: (value: string) => void }) => {
  const { resolvedTheme } = useTheme();
  return (
    <div className="flex h-full min-h-80 flex-col gap-2 p-3">
      <p className="text-xs text-muted-foreground">
        What the preview shows, mirroring what the blok reads: JSON{" "}
        <span className="font-mono">{"{deps, args, task, queries, subscriptions}"}</span>, e.g.{" "}
        <span className="font-mono">{'{"deps": {"robot": {"arm": {"mode": "idle"}}}}'}</span> for what the blok reads as{" "}
        <span className="font-mono">agents.robot.arm.mode</span>. Locals start at their defaults.
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
  /** What the source's `<Blok context>` says; null while it says none. */
  context: ComponentContext | null;
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
      <p className="text-sm">{props.context ? BLOK_CONTEXTS[props.context].label : "—"}</p>
      <p className="text-xs text-muted-foreground">
        As the source&apos;s <span className="font-mono">{'<Blok context="...">'}</span> says: a custom blok is a panel or a scene.
      </p>
    </div>
  </div>
);

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
  <div className="h-full p-3">
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
  // Mounted as a custom blok on the dependencies declared here, as the server checks a save.
  const scope = useMemo((): BlokCheckScope => mountedBlokScope([CUSTOM_KIND], dependencies, argKeys), [dependencies, argKeys]);
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
  // What the blok is, as its `<Blok>` says: its context is sent along on create (the server holds it to the root).
  const header = useMemo(() => (analysis.tree ? blokHeader(analysis.tree) : null), [analysis.tree]);
  const context = header ? (header.context as ComponentContext) : null;
  const declared = useMemo(() => ({ vocab: VOCAB, demo: declarations.demo }), [declarations]);
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
        analysis.resolved ? [...analysis.resolved].map(([node, { local }]) => ({ ...local, node }) as BlokDeclaredLocal) : null,
        check.status === "ok" || check.status === "warnings" ? check : null,
        checkKey,
      ),
    [analysis.resolved, check, checkKey],
  );
  // The preview keeps the last declarations that held while the author is mid-edit. It
  // types the locals as the tree resolves them (by their `<local>` node), never as written.
  const lastDeclarations = useRef<BlokDeclarations>({ resolvedLocals: [] });
  if (valid && resolvedLocals) {
    lastDeclarations.current = { vocab: VOCAB, resolvedLocals, demo: declarations.demo };
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
  const blocked = !draft.name.trim() || !parses || context === null || !valid || (checkDependencies && problems.size > 0);
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
              context: context ?? ComponentContext.Panel,
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
            <DetailsPanel draft={draft} context={context} onChange={change} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Agents">
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
          <div className="flex flex-wrap items-center gap-2 border-b border-warning/40 bg-warning/10 px-3 py-2 text-sm">
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
                  onChange={(next) => change({ source: next })}
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
      source: STARTER,
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
      args={blok.args}
      onReload={reload}
    />
  );
};

/**
 * A blok an app provides is its agents' to change. A fork is not the same text: the app's own
 * agent (`self`) becomes one the copy is bound to, so the copy is made first and edited then.
 */
const ForkToEdit = ({ blok }: { blok: BlokEditorFragment }) => {
  const { openDialog } = useDialog();
  return (
    <PageLayout title={`Edit ${blok.name}`} help={REKUEST_HELP.blokEditor}>
      <StatusPage
        variant="compact"
        icon={GitFork}
        title="This blok belongs to its app"
        description="Its agents keep it in step with what they register, so it is not changed by hand. Fork it to get a copy of your own: the copy reads the app's agent as one it is bound to, and opens ready to edit."
        actions={<Button onClick={() => openDialog("forkblok", { id: blok.id, name: blok.name })}>Fork</Button>}
      />
    </PageLayout>
  );
};

/** An existing blok, printed back to BSX: the server keeps the tree, not the text. */
export const EditBlokEditorPage = asDetailQueryRoute(useBlokEditorQuery, ({ data, refetch }) =>
  data.blok.provided ? <ForkToEdit blok={data.blok} /> : <EditorFor blok={data.blok} refetch={refetch} />,
);
