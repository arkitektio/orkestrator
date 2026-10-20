import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { Sidebars } from "@/core/layout/Sidebars";
import Timestamp from "@/core/ui/timestamp";
import { FlussPythonFlow } from "@/core/linkers";
import {
  Effects,
  PythonFlowFragment,
  useCreatePythonFlowMutation,
  useUpdatePythonFlowMutation,
} from "@/fluss/api/graphql";
import type { ListActionFragment } from "@/rekuest/api/graphql";
import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearDraft, draftKey, readDraft, writeDraft } from "./draft";
import { aliasFor, ManifestRow, rowProblem, seedStructures, SignaturePort, toManifestInput } from "./manifest";
import { ManifestPanel } from "./ManifestPanel";
import { PortLines } from "./ports";
import { PythonSourceEditor } from "./PythonSourceEditor";
import { PythonFlowStatusBadge } from "./StatusBadges";
import { NEW_FLOW_SOURCE } from "./stubs";
import { useRekuestActions } from "./useRekuestActions";
import { useValidation } from "./useValidation";

export type WorkbenchLayout = (parts: {
  title: ReactNode;
  pageActions: ReactNode;
  sidebars: ReactNode;
  body: ReactNode;
}) => ReactElement;

const rowsOf = (base: PythonFlowFragment | null): ManifestRow[] =>
  base?.manifest.map((entry) => ({ alias: entry.alias, actionHash: entry.actionHash, effect: entry.effect, action: null })) ?? [];

const manifestKey = (rows: readonly { alias: string; actionHash: string; effect: Effects }[]) =>
  JSON.stringify(rows.map((row) => [row.alias, row.actionHash, row.effect]));

/**
 * Editing a Python flow: the source, the actions it may call, and the
 * server's live check of both. Every version is immutable, so saving makes a
 * new version on top of `base` (or the first of a new flow); work that does
 * not validate yet lives in this browser until it does.
 */
export const PythonFlowWorkbench = ({ base, layout }: { base: PythonFlowFragment | null; layout: WorkbenchLayout }) => {
  const navigate = useNavigate();
  const { resolve, search } = useRekuestActions();
  const draftId = draftKey(base?.id);
  const [restored] = useState(() => readDraft(draftId));

  const [source, setSource] = useState(restored?.source ?? base?.source ?? NEW_FLOW_SOURCE);
  const [title, setTitle] = useState(restored?.title ?? base?.title ?? "");
  const [rows, setRows] = useState<ManifestRow[]>(() =>
    restored ? restored.manifest.map((entry) => ({ ...entry, action: null })) : rowsOf(base),
  );
  // null until the author edits them: then the structures the stored signature needs, derived below.
  const [editedStructures, setEditedStructures] = useState<string[] | null>(restored?.structures ?? null);
  const [showRestored, setShowRestored] = useState(!!restored);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const [createFlow] = useCreatePythonFlowMutation();
  const [updateFlow] = useUpdatePythonFlowMutation();

  // Look every row's action up in rekuest: the stored manifest holds hashes only.
  const pending = rows.filter((row) => !row.action && !row.missing).map((row) => row.actionHash);
  const pendingKey = pending.join(",");
  useEffect(() => {
    if (pending.length === 0) return;
    let cancelled = false;
    void Promise.all(pending.map(async (hash) => [hash, await resolve(hash)] as const)).then((found) => {
      if (cancelled) return;
      const byHash = new Map(found);
      setRows((current) =>
        current.map((row) =>
          byHash.has(row.actionHash) && !row.action
            ? { ...row, action: byHash.get(row.actionHash) ?? null, missing: !byHash.get(row.actionHash) }
            : row,
        ),
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, resolve]);
  const hydrating = pending.length > 0;

  // A stored version does not keep its extra structures: they are what its signature uses and
  // none of its actions mention, known once its actions are.
  const derivedStructures = useMemo(
    () =>
      !base ? [] : hydrating ? null : seedStructures([...base.args, ...base.returns] as unknown as SignaturePort[], rows),
    [base, hydrating, rows],
  );
  const structures = useMemo(() => editedStructures ?? derivedStructures ?? [], [editedStructures, derivedStructures]);

  const manifest = useMemo(() => toManifestInput(rows), [rows]);
  const { validation, validating, error: validationError } = useValidation({
    source,
    manifest,
    structures,
    entrypoint: base?.entrypoint,
    paused: hydrating || (editedStructures === null && derivedStructures === null),
  });

  const baseManifestKey = manifestKey(base?.manifest ?? []);
  const dirty =
    source !== (base?.source ?? NEW_FLOW_SOURCE) ||
    title !== (base?.title ?? "") ||
    manifestKey(rows) !== baseManifestKey;

  // Keep unsaved edits in this browser, so a source that does not validate yet survives leaving.
  useEffect(() => {
    if (!dirty) {
      clearDraft(draftId);
      return;
    }
    const timer = setTimeout(
      () =>
        writeDraft(draftId, {
          source,
          title,
          structures,
          manifest: rows.map(({ alias, actionHash, effect }) => ({ alias, actionHash, effect })),
        }),
      500,
    );
    return () => clearTimeout(timer);
  }, [dirty, draftId, source, title, structures, rows]);

  const problems = rows.map((row) => rowProblem(row, rows)).filter(Boolean);
  const canSave = dirty && !hydrating && !validating && !!validation?.ok && problems.length === 0 && !saving;

  const addAction = async (action: ListActionFragment, alias?: string) => {
    const taken = new Set(rows.map((row) => row.alias));
    const name = alias ?? aliasFor(action.name, taken);
    setRows((current) =>
      current.some((row) => row.actionHash === action.hash)
        ? current
        : [...current, { alias: name, actionHash: action.hash, effect: Effects.Unknown, action: null }],
    );
  };

  const discardDraft = () => {
    clearDraft(draftId);
    setSource(base?.source ?? NEW_FLOW_SOURCE);
    setTitle(base?.title ?? "");
    setRows(rowsOf(base));
    setEditedStructures(null);
    setShowRestored(false);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await createFlow({
        variables: {
          input: {
            source,
            entrypoint: base?.entrypoint ?? "main",
            manifest,
            structures,
            title: title.trim() || null,
            previous: base?.id ?? null,
          },
        },
      });
      const saved = data?.createPythonFlow;
      if (!saved) throw new Error("The server returned no flow");
      // Identical content is the same version, whose title the create left alone.
      if (title.trim() && saved.title !== title.trim()) {
        await updateFlow({ variables: { input: { id: saved.id, title: title.trim() } } });
      }
      clearDraft(draftId);
      if (saved.id !== base?.id) navigate(FlussPythonFlow.linkBuilder(saved.id));
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const diagnostics = validation?.diagnostics ?? [];
  const checkState = hydrating ? (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up actions…
    </span>
  ) : validating ? (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
    </span>
  ) : validation?.ok ? (
    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> Checks out
    </span>
  ) : validation ? (
    <span className="flex items-center gap-1.5 text-destructive">
      <XCircle className="h-3.5 w-3.5" /> {diagnostics.length} {diagnostics.length === 1 ? "problem" : "problems"}
    </span>
  ) : null;

  const body = (
    <div className="flex h-full min-h-[24rem] flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={base?.title ?? "Untitled Python Flow"}
          className="h-8 max-w-sm border-transparent px-1 text-base font-medium shadow-none focus-visible:border-input"
          aria-label="Title"
        />
        {base && <PythonFlowStatusBadge status={base.status} />}
        <div className="text-sm">{checkState}</div>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
      {showRestored && restored && (
        <div className="flex shrink-0 items-center gap-3 border-b bg-muted/40 px-3 py-1.5 text-xs">
          <span>
            Restored unsaved edits from <Timestamp date={new Date(restored.savedAt)} relative />.
          </span>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={discardDraft}>
            Discard them
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowRestored(false)}>
            Keep
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <PythonSourceEditor
          value={source}
          onChange={setSource}
          diagnostics={diagnostics}
          stubs={validation?.stubs}
          manifestHashes={new Set(rows.map((row) => row.actionHash))}
          takenAliases={new Set(rows.map((row) => row.alias))}
          searchActions={search}
          onAddAction={(action, alias) => void addAction(action, alias)}
        />
      </div>
      {(validationError != null || saveError != null) && (
        <div className="shrink-0 border-t px-3 py-2">
          <ErrorNote variant="line" error={saveError ?? validationError} title={saveError ? "Couldn't save the flow" : "Couldn't check the flow"} />
        </div>
      )}
    </div>
  );

  const sidebars = (
    <Sidebars sidebarKey="fluss:pythonflow">
      <Sidebars.Tab label="Manifest">
        <ManifestPanel
          rows={rows}
          onChange={setRows}
          onAdd={(action) => void addAction(action)}
          structures={structures}
          onStructuresChange={setEditedStructures}
        />
      </Sidebars.Tab>
      <Sidebars.Tab label="Ports">
        <div className="flex flex-col gap-4 p-3">
          <div className="text-xs text-muted-foreground">
            What <span className="font-mono">main</span> takes and gives, as the last check read it. These become the
            action&apos;s ports when the flow is deployed.
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Arguments</div>
            <PortLines ports={(validation?.ok ? validation.args : base?.args ?? []) as unknown as SignaturePort[]} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Returns</div>
            <PortLines ports={(validation?.ok ? validation.returns : base?.returns ?? []) as unknown as SignaturePort[]} />
          </div>
          {validation?.runtime && <div className="text-xs text-muted-foreground">Runtime: {validation.runtime}</div>}
        </div>
      </Sidebars.Tab>
      {base && (
        <Sidebars.Tab label="Versions">
          <div className="flex flex-col p-2">
            {[...base.versions].reverse().map((version) => (
              <FlussPythonFlow.DetailLink
                key={version.id}
                object={version}
                className={
                  version.id === base.id
                    ? "flex items-center gap-2 rounded bg-muted px-2 py-1.5"
                    : "flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/60"
                }
              >
                <span className="flex-1 truncate text-sm">{version.title}</span>
                <span className="text-xs text-muted-foreground">
                  <Timestamp date={version.createdAt} relative />
                </span>
                <PythonFlowStatusBadge status={version.status} className="text-[10px]" />
              </FlussPythonFlow.DetailLink>
            ))}
          </div>
        </Sidebars.Tab>
      )}
    </Sidebars>
  );

  const pageActions = (
    <Button
      size="sm"
      onClick={() => void save()}
      disabled={!canSave}
      className="gap-1.5"
      title={canSave ? undefined : dirty ? "The flow saves once it checks out" : "Nothing to save"}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {base ? "Save as new version" : "Save"}
    </Button>
  );

  return layout({ title: title || base?.title || "New Python flow", pageActions, sidebars, body });
};
