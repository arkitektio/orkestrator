import { Button } from "@/core/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCollaborationDerivedQuery } from "../../api/graphql";
import { DerivedLineageGraph } from "./DerivedLineageGraph";
import {
  DEFAULT_DEPTH,
  derivedForest,
  isPicked,
  lineageRootOf,
  MAX_DEPTH,
  MIN_DEPTH,
  pickDerived,
  subtreeKeys,
  type CollaborationRef,
  type DerivedMode,
  type DerivedNode,
} from "./derivedSelection";

/** What is derived from `objects`, and how much of it the user chose to put in with them. */
export const useDerivedSelection = (objects: readonly CollaborationRef[]) => {
  const [mode, setMode] = useState<DerivedMode>("none");
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  const starts = useMemo(() => objects.flatMap((object) => lineageRootOf(object) ?? []), [objects]);
  const { data, previousData, loading, error } = useCollaborationDerivedQuery({
    variables: { starts, down: depth },
    skip: mode === "none" || starts.length === 0,
  });
  useEffect(() => {
    // The objects still go in without it: a console line, the summary says nothing was found.
    if (error) console.warn("Couldn't load what was derived from the objects", error);
  }, [error]);

  const answer = data ?? previousData;
  const forest = useMemo(() => derivedForest(answer?.descendants ?? []), [answer]);
  const picked = useMemo(() => pickDerived(forest, mode, depth, overrides), [forest, mode, depth, overrides]);

  // The same rule `pickDerived` sends by: "All derived" ignores hand-picks.
  const isOn = useCallback(
    (node: DerivedNode) => (mode === "all" ? node.depth <= depth : mode === "custom" && isPicked(node, depth, overrides)),
    [mode, depth, overrides],
  );

  /**
   * Flip a node (and, with `subtree`, everything below it) to the opposite of
   * what it is now. In "All derived" this turns the choice into a custom one
   * that starts from the same picks.
   */
  const toggle = useCallback(
    (node: DerivedNode, subtree: boolean) => {
      const on = !isOn(node);
      const fromAll = mode === "all";
      setOverrides((previous) => {
        const next = fromAll ? new Map<string, boolean>() : new Map(previous);
        for (const key of subtree ? subtreeKeys(node) : [node.key]) next.set(key, on);
        return next;
      });
      setMode("custom");
    },
    [isOn, mode],
  );

  return {
    /** Whether anything selected has a lineage to walk at all. */
    walkable: starts.length > 0,
    mode,
    setMode,
    depth,
    setDepth,
    isOn,
    toggle,
    forest,
    picked,
    /** The walk for the current depth is still on its way: what is picked may change. */
    pending: mode !== "none" && loading,
  };
};

export type DerivedSelection = ReturnType<typeof useDerivedSelection>;

/** The "Derived data" choice: nothing, everything down to a depth, or hand-picked on the lineage graph. */
export const DerivedDataPicker = ({ selection }: { selection: DerivedSelection }) => {
  const { mode, setMode, depth, setDepth, forest, picked, pending } = selection;
  if (!selection.walkable) return null;

  return (
    <div className="flex flex-col gap-2 border-b pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Derived data</span>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={mode}
          onValueChange={(value) => value && setMode(value as DerivedMode)}
        >
          <ToggleGroupItem value="none">No analysis</ToggleGroupItem>
          <ToggleGroupItem value="all">All derived</ToggleGroupItem>
          <ToggleGroupItem value="custom">Custom</ToggleGroupItem>
        </ToggleGroup>
        {mode !== "none" && (
          <div className="ml-auto flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Depth</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Fewer hops"
              disabled={depth <= MIN_DEPTH}
              onClick={() => setDepth(depth - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-4 text-center tabular-nums">{depth}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="More hops"
              disabled={depth >= MAX_DEPTH}
              onClick={() => setDepth(depth + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      {mode !== "none" && (
        <div className="text-xs text-muted-foreground">
          {pending && forest.trees.length === 0
            ? "Looking for derived data…"
            : forest.trees.length === 0
              ? "Nothing was derived from this."
              : `+${picked.length} derived · click a node to put it in or leave it out, shift-click for everything below it`}
          {forest.more && " · the walk stopped early; some derived data isn't listed"}
        </div>
      )}
      {mode !== "none" && forest.trees.length > 0 && (
        <DerivedLineageGraph forest={forest} isOn={selection.isOn} onToggle={selection.toggle} />
      )}
    </div>
  );
};
