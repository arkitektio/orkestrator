import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Switch } from "@/core/ui/switch";
import { cn } from "@/core/util/utils";
import { Lock, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { emptyDependency, type DemandedDraft, type DependencyDraft } from "./blokDependencies";

const KEY_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A dependency's action or state keys: chips, and a field that adds one on Enter. */
const KeyChips = <Demand,>(props: {
  label: string;
  hint: string;
  items: DemandedDraft<Demand>[];
  disabled: boolean;
  onChange: (items: DemandedDraft<Demand>[]) => void;
}) => {
  const [draft, setDraft] = useState("");
  const name = draft.trim();
  const valid = KEY_NAME.test(name) && !props.items.some((item) => item.key === name);
  const add = () => {
    if (!valid) return;
    props.onChange([...props.items, { key: name, description: "", optional: false, demand: null }]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{props.label}</Label>
      <div className="flex flex-wrap items-center gap-1">
        {props.items.map((item) => (
          <Badge
            key={item.key}
            variant="secondary"
            className="gap-1 font-mono"
            title={item.demand ? "Matched by a demand, kept as it is" : undefined}
          >
            {item.key}
            {!props.disabled && (
              <button
                type="button"
                aria-label={`Remove ${item.key}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => props.onChange(props.items.filter((other) => other.key !== item.key))}
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
        {!props.disabled && (
          <Input
            value={draft}
            placeholder={props.hint}
            aria-label={`Add to ${props.label}`}
            className="h-7 w-32 font-mono text-xs"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add();
              }
            }}
            onBlur={add}
          />
        )}
      </div>
    </div>
  );
};

const count = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const DependencyRow = (props: {
  draft: DependencyDraft;
  problem?: string;
  disabled: boolean;
  onChange: (draft: DependencyDraft) => void;
  onRemove: () => void;
}) => {
  const { draft, disabled } = props;
  const set = (patch: Partial<DependencyDraft>) => props.onChange({ ...draft, ...patch });
  const locked = disabled || draft.locked;

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={draft.key}
          aria-label="Key"
          placeholder="key"
          disabled={locked}
          className={cn("h-8 font-mono", props.problem && "border-destructive")}
          onChange={(event) => set({ key: event.target.value })}
        />
        {draft.locked ? (
          <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Kept as it is" />
        ) : (
          <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label="Remove dependency" onClick={props.onRemove}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {props.problem && <p className="text-xs text-destructive">{props.problem}</p>}
      {draft.locked && (
        <p className="text-xs text-muted-foreground">
          A demand of this dependency nests deeper than the editor reads, so the dependencies are kept as they are.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={draft.app}
          aria-label="App"
          placeholder="app (identifier)"
          disabled={locked}
          className="h-8 text-xs"
          onChange={(event) => set({ app: event.target.value })}
        />
        <Input
          value={draft.version}
          aria-label="Version"
          placeholder="version"
          disabled={locked}
          className="h-8 text-xs"
          onChange={(event) => set({ version: event.target.value })}
        />
      </div>
      <Input
        value={draft.description}
        aria-label="Description"
        placeholder="What it is for"
        disabled={locked}
        className="h-8 text-xs"
        onChange={(event) => set({ description: event.target.value })}
      />
      <KeyChips
        label="Actions"
        hint="add action"
        items={draft.actions}
        disabled={locked}
        onChange={(actions) => set({ actions })}
      />
      <KeyChips
        label="States"
        hint="add state"
        items={draft.states}
        disabled={locked}
        onChange={(states) => set({ states })}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <label className="flex items-center gap-2">
          <Switch checked={draft.optional} disabled={locked} onCheckedChange={(optional) => set({ optional })} />
          Optional
        </label>
        <label className="flex items-center gap-2">
          <Switch
            checked={draft.autoResolvable}
            disabled={locked}
            onCheckedChange={(autoResolvable) => set({ autoResolvable })}
          />
          Auto-resolve
        </label>
        <label className="flex items-center gap-1">
          At least
          <Input
            value={draft.minViableInstances ?? ""}
            inputMode="numeric"
            aria-label="At least"
            disabled={locked}
            className="h-7 w-12 text-xs"
            onChange={(event) => set({ minViableInstances: count(event.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1">
          at most
          <Input
            value={draft.maxViableInstances ?? ""}
            inputMode="numeric"
            aria-label="At most"
            disabled={locked}
            className="h-7 w-12 text-xs"
            onChange={(event) => set({ maxViableInstances: count(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
};

/**
 * The agents a blok draws from, as keys its BSX names (`deps.stage.move()`,
 * `deps.stage.position`): one row per dependency, with the app it must be, the
 * actions it calls and the states it reads. What is declared here is what
 * completion offers and the reference check accepts.
 */
export const DependencyListEditor = (props: {
  dependencies: DependencyDraft[];
  problems: Map<string, string>;
  /** Some dependency cannot be sent back whole: the set is shown, not edited. */
  disabled?: boolean;
  onChange: (dependencies: DependencyDraft[]) => void;
}) => {
  const disabled = props.disabled ?? false;
  const replace = (uid: string, next: DependencyDraft | null) =>
    props.onChange(
      props.dependencies.flatMap((draft) => (draft.uid === uid ? (next ? [next] : []) : [draft])),
    );

  return (
    <div className="flex flex-col p-3">
      {props.dependencies.length === 0 && (
        <p className="pb-2 text-sm text-muted-foreground">
          No dependencies: the blok calls no agent. Add one to name it in BSX, e.g. <span className="font-mono">@stage.move()</span>.
        </p>
      )}
      <div className="flex flex-col divide-y divide-border">
        {props.dependencies.map((draft) => (
          <DependencyRow
            key={draft.uid}
            draft={draft}
            problem={props.problems.get(draft.uid)}
            disabled={disabled}
            onChange={(next) => replace(draft.uid, next)}
            onRemove={() => replace(draft.uid, null)}
          />
        ))}
      </div>
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 self-start"
          onClick={() => props.onChange([...props.dependencies, emptyDependency()])}
        >
          <Plus className="size-4" />
          Add dependency
        </Button>
      )}
    </div>
  );
};
