import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { Effects } from "@/fluss/api/graphql";
import { useActionSearch } from "@/fluss/edit/contextuals/useActionSearch";
import { ActionKind, ListActionFragment } from "@/rekuest/api/graphql";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { ManifestRow, rowProblem } from "./manifest";
import { portType } from "./ports";

const EFFECT_LABEL: Record<Effects, string> = {
  [Effects.None]: "No effect",
  [Effects.Repeatable]: "Repeatable",
  [Effects.Unknown]: "Unknown",
  [Effects.Irreversible]: "Irreversible",
};

const EFFECT_HINT: Record<Effects, string> = {
  [Effects.None]: "Calling it again changes nothing",
  [Effects.Repeatable]: "Calling it again repeats harmless work",
  [Effects.Unknown]: "Nobody said what calling it again does",
  [Effects.Irreversible]: "Calling it again does something again in the world (a resumed run may repeat it)",
};

const ActionPicker = (props: {
  exclude: ReadonlySet<string>;
  onPick: (action: ListActionFragment) => void;
}) => {
  const [search, setSearch] = useState("");
  const { actions, loading } = useActionSearch({ search: search || undefined, kind: ActionKind.Function, limit: 8 });
  const offered = actions.filter((action) => !props.exclude.has(action.hash));

  return (
    <div className="flex flex-col gap-1">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search function actions…"
        className="h-8 text-sm"
        autoFocus
      />
      <div className="flex flex-col">
        {loading && offered.length === 0 && <Loader2 className="m-2 h-4 w-4 animate-spin text-muted-foreground" />}
        {!loading && offered.length === 0 && (
          <div className="px-1 py-2 text-xs text-muted-foreground">No function action matches.</div>
        )}
        {offered.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => props.onPick(action)}
            className="flex flex-col items-start rounded px-2 py-1 text-left hover:bg-muted"
          >
            <span className="text-sm">{action.name}</span>
            {action.description && (
              <span className="line-clamp-1 text-xs text-muted-foreground">{action.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * The actions a Python flow may call, under the name the source calls them
 * by. Each row says what calling it again would do (rekuest's actions do not
 * carry it, so the author does).
 */
export const ManifestPanel = (props: {
  rows: readonly ManifestRow[];
  onChange: (rows: ManifestRow[]) => void;
  onAdd: (action: ListActionFragment) => void;
  structures: readonly string[];
  onStructuresChange: (structures: string[]) => void;
  readOnly?: boolean;
}) => {
  const { rows, onChange, readOnly } = props;
  const [picking, setPicking] = useState(false);
  const [structure, setStructure] = useState("");
  const hashes = new Set(rows.map((row) => row.actionHash));
  const update = (index: number, patch: Partial<ManifestRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</div>
          {!readOnly && (
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setPicking((p) => !p)}>
              {picking ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {picking ? "Close" : "Add action"}
            </Button>
          )}
        </div>
        {picking && (
          <ActionPicker
            exclude={hashes}
            onPick={(action) => {
              props.onAdd(action);
              setPicking(false);
            }}
          />
        )}
        {rows.length === 0 && !picking && (
          <div className="text-xs text-muted-foreground">
            No actions yet. Add one here, or start typing an action&apos;s name in the editor.
          </div>
        )}
        {rows.map((row, index) => {
          const problem = rowProblem(row, rows);
          return (
            <div key={`${row.actionHash}-${index}`} className="flex flex-col gap-1.5 border-b pb-3 last:border-b-0">
              <div className="flex items-center gap-2">
                <Input
                  value={row.alias}
                  onChange={(e) => update(index, { alias: e.target.value })}
                  readOnly={readOnly}
                  className="h-7 flex-1 font-mono text-sm"
                  aria-label="Name in the source"
                />
                {!readOnly && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Remove"
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {row.action ? row.action.name : row.missing ? "Unknown action" : "Looking up…"}
                {row.action?.app && <span className="opacity-70"> · {row.action.app.identifier}</span>}
              </div>
              {row.action && (
                <div className="truncate font-mono text-xs text-muted-foreground">
                  ({row.action.args.map((port) => `${port.key}: ${portType(port)}`).join(", ")}) →{" "}
                  {row.action.returns.map(portType).join(", ") || "None"}
                </div>
              )}
              <Select
                value={row.effect}
                onValueChange={(value) => update(index, { effect: value as Effects })}
                disabled={readOnly}
              >
                <SelectTrigger className="h-7 text-xs" title={EFFECT_HINT[row.effect]}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Effects).map((effect) => (
                    <SelectItem key={effect} value={effect} className="text-xs">
                      {EFFECT_LABEL[effect]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {row.effect === Effects.Irreversible && (
                <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {EFFECT_HINT[Effects.Irreversible]}
                </div>
              )}
              {problem && <div className="text-xs text-destructive">{problem}</div>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Extra structures</div>
        <div className="text-xs text-muted-foreground">
          Structures the signature of <span className="font-mono">main</span> uses that no action mentions.
        </div>
        <div className="flex flex-wrap gap-1">
          {props.structures.map((identifier) => (
            <Badge key={identifier} variant="outline" className="gap-1 font-mono font-normal">
              {identifier}
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Remove ${identifier}`}
                  onClick={() => props.onStructuresChange(props.structures.filter((s) => s !== identifier))}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
        {!readOnly && (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const value = structure.trim();
              if (value && !props.structures.includes(value)) props.onStructuresChange([...props.structures, value]);
              setStructure("");
            }}
          >
            <Input
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              placeholder="@mikro/image"
              className="h-7 font-mono text-xs"
            />
            <Button type="submit" size="sm" variant="outline" className="h-7" disabled={!structure.trim()}>
              Add
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
