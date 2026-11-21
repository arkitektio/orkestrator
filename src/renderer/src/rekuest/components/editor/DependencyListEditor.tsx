import { Button } from "@/core/ui/button";
import { CopyButton } from "@/core/ui/copy-button";
import { Input } from "@/core/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Switch } from "@/core/ui/switch";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { cn } from "@/core/util/utils";
import { useAgentForProtocolQuery, useAgentsQuery } from "@/rekuest/api/graphql";
import { ChevronRight, Lock, Plus, Search, Trash2, TriangleAlert, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  actionSlot,
  draftForAgent,
  offerOf,
  sourceUsage,
  stateSlot,
  undeclaredKeys,
  undeclaredNames,
  type AgentOffer,
  type KeyUsage,
} from "./agentCatalog";
import { emptyDependency, type DemandedDraft, type DependencyDraft } from "./blokDependencies";

const KEY_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** The agent a key is bound to where the preview runs live. */
export type BoundAgent = { id: string; name: string | null; connected: boolean };

const Dot = ({ on, title }: { on: boolean; title: string }) => (
  <span className={cn("size-1.5 shrink-0 rounded-full", on ? "bg-success" : "bg-muted-foreground/40")} title={title} />
);

const count = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

/** What a row of one sort is: declared, offered by the agent, or only named by the source. */
type SlotRow = {
  key: string;
  /** Under the name: its arguments or fields, and what it is for. */
  detail: string;
  declared: boolean;
  /** The source names it. */
  used: boolean;
  /** Declaring it: from what the agent offers when known, else by name alone. */
  add: () => void;
};

/**
 * One sort of what a dependency uses (its actions, or its states): what is
 * declared first, then what the source names without declaring, then what
 * the agent offers besides. A row is declared and dropped in place, so the
 * list is picked from, not typed from memory; the field below adds a name the
 * agent does not offer (yet).
 */
const SlotList = (props: {
  title: string;
  /** How a declared name is written in BSX, for the copy button. */
  snippet: (key: string) => string;
  rows: SlotRow[];
  disabled: boolean;
  onRemove: (key: string) => void;
  onAddByName: (key: string) => void;
  /** Whether the agent's offer is known: without it, only names can be typed. */
  offerKnown: boolean;
}) => {
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [showAll, setShowAll] = useState(false);
  const needle = filter.trim().toLowerCase();
  const declared = props.rows.filter((row) => row.declared);
  const others = props.rows.filter((row) => !row.declared);
  const match = (row: SlotRow) => !needle || row.key.toLowerCase().includes(needle) || row.detail.toLowerCase().includes(needle);
  const shownOthers = others.filter(match);
  // What the source names comes first, and is never folded away.
  const pressing = shownOthers.filter((row) => row.used);
  const offered = shownOthers.filter((row) => !row.used);
  const folded = !showAll && !needle && offered.length > 6;
  const typed = name.trim();
  const canAdd = KEY_NAME.test(typed) && !props.rows.some((row) => row.declared && row.key === typed);
  const add = () => {
    if (!canAdd) return;
    props.onAddByName(typed);
    setName("");
  };

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          {props.title}
          <span className="ml-1.5 font-normal tabular-nums text-muted-foreground/60">{declared.length}</span>
        </h4>
        {props.rows.length > 8 && (
          <Input
            value={filter}
            placeholder="Filter"
            aria-label={`Filter ${props.title}`}
            className="ml-auto h-6 w-28 text-xs"
            onChange={(event) => setFilter(event.target.value)}
          />
        )}
      </div>
      {declared.length === 0 && (
        <p className="text-xs text-muted-foreground">
          None declared: the source may name any. Declare the ones it uses to have them completed and checked.
        </p>
      )}
      <ul className="flex flex-col">
        {declared.filter(match).map((row) => (
          <li key={row.key} className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/60">
            <span className="mt-1.5">
              <Dot on={row.used} title={row.used ? "Used in the source" : "Not used in the source yet"} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-mono text-xs">{row.key}</span>
              {row.detail && <span className="truncate text-[11px] text-muted-foreground">{row.detail}</span>}
            </span>
            <CopyButton
              value={props.snippet(row.key)}
              title={`Copy ${props.snippet(row.key)}`}
              className="size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            />
            {!props.disabled && (
              <button
                type="button"
                aria-label={`Remove ${row.key}`}
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => props.onRemove(row.key)}
              >
                <X className="size-3" />
              </button>
            )}
          </li>
        ))}
        {!props.disabled &&
          [...pressing, ...(folded ? offered.slice(0, 4) : offered)].map((row) => (
            <li key={row.key}>
              <button
                type="button"
                className="group flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/60"
                title={`Declare ${row.key}`}
                onClick={row.add}
              >
                {row.used ? (
                  <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
                ) : (
                  <Plus className="mt-0.5 size-3 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("truncate font-mono text-xs", !row.used && "text-muted-foreground")}>{row.key}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {row.used ? "Named in the source, not declared" : row.detail}
                  </span>
                </span>
              </button>
            </li>
          ))}
      </ul>
      {folded && (
        <button
          type="button"
          className="self-start px-1.5 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => setShowAll(true)}
        >
          {offered.length - 4} more offered
        </button>
      )}
      {!props.disabled && (
        <Input
          value={name}
          placeholder={props.offerKnown ? "Add another by name" : "Add by name"}
          aria-label={`Add to ${props.title}`}
          className="mt-0.5 h-7 font-mono text-xs"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      )}
    </section>
  );
};

const Field = ({ label, className, children }: { label: string; className?: string; children: ReactNode }) => (
  <label className={cn("flex min-w-0 flex-col gap-1", className)}>
    <span className="text-[11px] text-muted-foreground">{label}</span>
    {children}
  </label>
);

/**
 * What an agent of this dependency offers, to pick from: the agent the key is
 * bound to where the preview runs live, else any agent of the dependency's
 * app. Asked only while the dependency is open.
 */
const useOffer = (draft: DependencyDraft, bound: BoundAgent | undefined, open: boolean): { offer: AgentOffer | null; from: string | null } => {
  const app = draft.app.trim();
  const ofApp = useAgentsQuery({
    variables: { filters: { appIdentifier: app }, pagination: { limit: 1 } },
    skip: !open || !!bound || !app,
  });
  const agent = bound ?? ofApp.data?.agents.at(0);
  const protocol = useAgentForProtocolQuery({ variables: { id: agent?.id ?? "" }, skip: !open || !agent });
  const offer = useMemo(() => (protocol.data?.agent ? offerOf(protocol.data.agent) : null), [protocol.data]);
  return { offer, from: offer ? (agent?.name ?? null) : null };
};

const DependencySection = (props: {
  draft: DependencyDraft;
  problem?: string;
  disabled: boolean;
  usage: KeyUsage | undefined;
  /** Undefined when the preview runs on the demo; null when it runs live and this key is bound to no agent. */
  bound: BoundAgent | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (draft: DependencyDraft) => void;
  onRemove: () => void;
}) => {
  const { draft, disabled, usage } = props;
  const set = (patch: Partial<DependencyDraft>) => props.onChange({ ...draft, ...patch });
  const locked = disabled || draft.locked;
  const [advanced, setAdvanced] = useState(false);
  const { offer, from } = useOffer(draft, props.bound ?? undefined, props.open);
  const key = draft.key.trim() || "key";

  const rows = <Demand,>(
    slots: DemandedDraft<Demand>[],
    used: ReadonlySet<string> | undefined,
    offered: { key: string; detail: string; slot: () => DemandedDraft<Demand> }[],
    write: (next: DemandedDraft<Demand>[]) => void,
  ): SlotRow[] => {
    const byKey = new Map(offered.map((entry) => [entry.key, entry]));
    const declared = new Set(slots.map((slot) => slot.key));
    const byName = (name: string) => () =>
      write([...slots, byKey.get(name)?.slot() ?? { key: name, description: "", optional: false, demand: null }]);
    return [
      ...slots.map((slot) => ({
        key: slot.key,
        detail: byKey.get(slot.key)?.detail || slot.description,
        declared: true,
        used: used?.has(slot.key) ?? false,
        add: () => {},
      })),
      // Named by the source, declared nowhere: only a gap once this sort declares any.
      ...undeclaredNames(slots, used)
        .filter((name) => !byKey.has(name))
        .map((name) => ({ key: name, detail: "", declared: false, used: true, add: byName(name) })),
      ...offered
        .filter((entry) => !declared.has(entry.key))
        .map((entry) => ({
          key: entry.key,
          detail: entry.detail,
          declared: false,
          used: slots.length > 0 && (used?.has(entry.key) ?? false),
          add: byName(entry.key),
        })),
    ];
  };

  const actionRows = rows(
    draft.actions,
    usage?.actions,
    (offer?.actions ?? []).map((action) => ({
      key: action.key,
      detail: [action.args.length ? `(${action.args.join(", ")})` : "()", action.description || action.title].filter(Boolean).join(" · "),
      slot: () => actionSlot(action),
    })),
    (actions) => set({ actions }),
  );
  const stateRows = rows(
    draft.states,
    usage?.states,
    (offer?.states ?? []).map((state) => ({
      key: state.key,
      detail: state.fields.length ? state.fields.join(", ") : state.title,
      slot: () => stateSlot(state),
    })),
    (states) => set({ states }),
  );
  const gaps = [...actionRows, ...stateRows].filter((row) => !row.declared && row.used).length;

  return (
    <div className={cn("rounded-lg border", props.problem ? "border-destructive/60" : "border-border/70")}>
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/50"
          aria-expanded={props.open}
          onClick={() => props.onOpenChange(!props.open)}
        >
          <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", props.open && "rotate-90")} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-mono text-sm">
              <span className="text-muted-foreground">agents.</span>
              {key}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              {props.bound ? (
                <>
                  <Dot on={props.bound.connected} title={props.bound.connected ? "Connected" : "Offline"} />
                  <span className="truncate">{props.bound.name ?? "an agent"}</span>
                </>
              ) : props.bound === null ? (
                <span className="text-warning">not bound here</span>
              ) : (
                <span className="truncate">{draft.app || "any app"}</span>
              )}
              <span className="shrink-0">
                · {draft.actions.length} actions · {draft.states.length} states
              </span>
            </span>
          </span>
          {(props.problem || gaps > 0) && <TriangleAlert className="size-3.5 shrink-0 text-warning" />}
        </button>
        {draft.locked ? (
          <Lock className="mx-2 size-3.5 shrink-0 text-muted-foreground" aria-label="Kept as it is" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            disabled={disabled}
            aria-label={`Remove ${key}`}
            onClick={props.onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      {props.problem && <p className="px-3 pb-2 text-xs text-destructive">{props.problem}</p>}

      {props.open && (
        <div className="flex flex-col gap-4 border-t px-3 py-3">
          {draft.locked && (
            <p className="text-xs text-muted-foreground">
              A demand of this dependency nests deeper than the editor reads, so the dependencies are kept as they are.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Key (agents.<key>)">
              <Input
                value={draft.key}
                aria-label="Key"
                disabled={locked}
                className={cn("h-8 font-mono text-xs", props.problem && "border-destructive")}
                onChange={(event) => set({ key: event.target.value })}
              />
            </Field>
            <Field label="App it must be">
              <Input
                value={draft.app}
                aria-label="App"
                placeholder="any"
                disabled={locked}
                className="h-8 text-xs"
                onChange={(event) => set({ app: event.target.value })}
              />
            </Field>
            <Field label="What it is for" className="col-span-2">
              <Input
                value={draft.description}
                aria-label="Description"
                placeholder="Shown when the blok is bound to an agent"
                disabled={locked}
                className="h-8 text-xs"
                onChange={(event) => set({ description: event.target.value })}
              />
            </Field>
          </div>

          <SlotList
            title="Actions it calls"
            snippet={(name) => `agents.${key}.${name}()`}
            rows={actionRows}
            disabled={locked}
            offerKnown={!!offer}
            onRemove={(name) => set({ actions: draft.actions.filter((action) => action.key !== name) })}
            onAddByName={(name) => actionRows.find((row) => row.key === name && !row.declared)?.add() ?? set({ actions: [...draft.actions, { key: name, description: "", optional: false, demand: null }] })}
          />
          <SlotList
            title="States it reads"
            snippet={(name) => `agents.${key}.${name}`}
            rows={stateRows}
            disabled={locked}
            offerKnown={!!offer}
            onRemove={(name) => set({ states: draft.states.filter((state) => state.key !== name) })}
            onAddByName={(name) => stateRows.find((row) => row.key === name && !row.declared)?.add() ?? set({ states: [...draft.states, { key: name, description: "", optional: false, demand: null }] })}
          />
          <p className="text-[11px] text-muted-foreground">
            {from
              ? `Offered by ${from}. Click one to declare it.`
              : draft.app.trim()
                ? "No agent of this app is known here, so nothing is offered: add by name."
                : "Say which app it is to pick from what its agents offer."}
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={advanced}
              onClick={() => setAdvanced((current) => !current)}
            >
              <ChevronRight className={cn("size-3 transition-transform", advanced && "rotate-90")} />
              Binding rules
            </button>
            {advanced && (
              <div className="flex flex-col gap-2.5 text-xs">
                <label className="flex items-center justify-between gap-3">
                  <span className="flex flex-col">
                    Optional
                    <span className="text-[11px] text-muted-foreground">The blok works with no agent bound here.</span>
                  </span>
                  <Switch checked={draft.optional} disabled={locked} onCheckedChange={(optional) => set({ optional })} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="flex flex-col">
                    Bind automatically
                    <span className="text-[11px] text-muted-foreground">Pick a fitting agent without asking.</span>
                  </span>
                  <Switch
                    checked={draft.autoResolvable}
                    disabled={locked}
                    onCheckedChange={(autoResolvable) => set({ autoResolvable })}
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Version">
                    <Input
                      value={draft.version}
                      aria-label="Version"
                      placeholder="any"
                      disabled={locked}
                      className="h-7 text-xs"
                      onChange={(event) => set({ version: event.target.value })}
                    />
                  </Field>
                  <Field label="At least">
                    <Input
                      value={draft.minViableInstances ?? ""}
                      inputMode="numeric"
                      aria-label="At least"
                      disabled={locked}
                      className="h-7 text-xs"
                      onChange={(event) => set({ minViableInstances: count(event.target.value) })}
                    />
                  </Field>
                  <Field label="At most">
                    <Input
                      value={draft.maxViableInstances ?? ""}
                      inputMode="numeric"
                      aria-label="At most"
                      disabled={locked}
                      className="h-7 text-xs"
                      onChange={(event) => set({ maxViableInstances: count(event.target.value) })}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Pick a real agent to depend on: searched on the server, asked only while open. */
const AgentPicker = (props: { onPick: (agent: { id: string; name: string; app?: { identifier: string } | null }) => void }) => {
  const [search, setSearch] = useState("");
  const term = useDebounce(search, 200);
  const { data, loading } = useAgentsQuery({
    variables: { filters: term.trim() ? { search: term.trim() } : {}, pagination: { limit: 25 } },
    fetchPolicy: "cache-and-network",
  });
  const agents = data?.agents ?? [];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={search}
          placeholder="Search agents"
          aria-label="Search agents"
          className="h-8 pl-7 text-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ul className="flex max-h-64 flex-col overflow-y-auto">
        {agents.map((agent) => (
          <li key={agent.id}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
              onClick={() => props.onPick(agent)}
            >
              <Dot on={agent.connected} title={agent.connected ? "Connected" : "Offline"} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{agent.name}</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">{agent.app?.identifier}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {agents.length === 0 && (
        <p className="px-2 py-1 text-xs text-muted-foreground">{loading ? "Looking…" : "No agent matches."}</p>
      )}
    </div>
  );
};

/**
 * The agents a blok draws from, as keys its BSX names (`agents.stage.move()`,
 * `agents.stage.position`). One foldable part per dependency: which app it
 * must be, and the actions it calls and the states it reads, PICKED from what
 * an agent of that app offers rather than typed. Each declared name says
 * whether the source uses it; what the source names without declaring is
 * listed with a one-click fix. Where the preview runs on a materialized blok,
 * each key shows the agent it is bound to there.
 */
export const DependencyListEditor = (props: {
  dependencies: DependencyDraft[];
  problems: Map<string, string>;
  /** Some dependency cannot be sent back whole: the set is shown, not edited. */
  disabled?: boolean;
  onChange: (dependencies: DependencyDraft[]) => void;
  /** The BSX as typed: what of each dependency it uses. */
  source?: string;
  /** Where the preview runs live: the agent each key is bound to. Absent on the demo. */
  bound?: ReadonlyMap<string, BoundAgent> | null;
}) => {
  const disabled = props.disabled ?? false;
  const usage = useMemo(() => sourceUsage(props.source ?? ""), [props.source]);
  // One dependency is shown open; among several, the ones opened by hand (and a new one).
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [picking, setPicking] = useState(false);
  const sole = props.dependencies.length === 1;
  const isOpen = (uid: string) => (sole ? !closed.has(uid) : opened.has(uid));
  const setOpen = (uid: string, open: boolean) => {
    const toggle = (set: ReadonlySet<string>, on: boolean) => {
      const next = new Set(set);
      if (on) next.add(uid);
      else next.delete(uid);
      return next;
    };
    setOpened((current) => toggle(current, open));
    setClosed((current) => toggle(current, !open));
  };

  const replace = (uid: string, next: DependencyDraft | null) =>
    props.onChange(props.dependencies.flatMap((draft) => (draft.uid === uid ? (next ? [next] : []) : [draft])));
  const append = (draft: DependencyDraft) => {
    props.onChange([...props.dependencies, draft]);
    setOpen(draft.uid, true);
  };
  const keys = props.dependencies.map((draft) => draft.key.trim());
  const missing = undeclaredKeys(usage, props.dependencies);

  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-xs text-muted-foreground">
        The agents this blok reads and calls. Each has a key the BSX names it by; binding it to a real agent happens when
        the blok is materialized.
      </p>

      {missing.length > 0 && !disabled && (
        <div className="flex flex-col gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs">
          <span>The source names agents that are not declared:</span>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 font-mono text-xs"
                onClick={() => append(emptyDependency(key))}
              >
                <Plus className="size-3" />
                {key}
              </Button>
            ))}
          </div>
        </div>
      )}

      {props.dependencies.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          This blok is bound to no agent. Add one to read its state and call its actions, e.g.{" "}
          <span className="font-mono text-xs">agents.stage.move()</span>.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {props.dependencies.map((draft) => (
          <DependencySection
            key={draft.uid}
            draft={draft}
            problem={props.problems.get(draft.uid)}
            disabled={disabled}
            usage={usage.get(draft.key.trim())}
            bound={props.bound ? (props.bound.get(draft.key.trim()) ?? null) : undefined}
            open={isOpen(draft.uid)}
            onOpenChange={(open) => setOpen(draft.uid, open)}
            onChange={(next) => replace(draft.uid, next)}
            onRemove={() => replace(draft.uid, null)}
          />
        ))}
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={picking} onOpenChange={setPicking}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus className="size-4" />
                Add agent
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              {picking && (
                <AgentPicker
                  onPick={(agent) => {
                    setPicking(false);
                    append(draftForAgent(agent, keys));
                  }}
                />
              )}
            </PopoverContent>
          </Popover>
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => append(emptyDependency())}>
            Add by hand
          </Button>
        </div>
      )}
    </div>
  );
};
