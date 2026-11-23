import { Check, Loader2, Plus, Share2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { useDebounce } from "@/core/util/hooks/use-debounce";

import { useCreateLokCollaboration, useLokCollaborations, type LokCollaboration } from "./useCollaborations";

/** What was picked: a collaboration lok already has, or the name of one to make. */
export type CollaborationTarget = { key: string; name: string } | { create: string };

/**
 * The picked collaboration, made in lok first when it was a new name. Callers run it inside
 * their submit (`useDialogSubmit`), so a failure shows in their dialog.
 */
export const useResolveCollaboration = () => {
  const create = useCreateLokCollaboration();
  return useCallback(
    async (target: CollaborationTarget): Promise<{ key: string; name: string }> => {
      if ("key" in target) return target;
      const made = await create(target.create);
      return { key: made.key, name: made.name };
    },
    [create],
  );
};

export type CollaborationPickerProps = {
  onPick: (target: CollaborationTarget) => void;
  /** The key of the one picked, marked as such. */
  selected?: string;
  /** Nothing can be picked while the caller is busy. */
  disabled?: boolean;
  /** Per row: whether it already holds what is being added (a check, not pickable), and a badge. */
  decorate?: (collaboration: LokCollaboration) => { done?: boolean; badge?: ReactNode };
  /** The key of the row being worked on, with a spinner. */
  pending?: string;
};

/**
 * Pick one of the organization's collaborations (lok's, one key across every service), or
 * name a new one: typing searches, and a name no collaboration has offers to make it.
 */
export const CollaborationPicker = ({ onPick, selected, disabled, decorate, pending }: CollaborationPickerProps) => {
  const [term, setTerm] = useState("");
  const search = useDebounce(term, 250);
  const { collaborations, loading, error } = useLokCollaborations(search);
  const name = term.trim();
  const exact = collaborations?.some((collaboration) => collaboration.name.toLowerCase() === name.toLowerCase());

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name && !exact) onPick({ create: name });
        }}
      >
        <Input
          placeholder="Search, or name a new collaboration…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label="Collaboration"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!name || exact || disabled}
          className="shrink-0 gap-2"
          title="Make a new collaboration with this name"
        >
          {pending === "__new__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
      </form>
      {/* No scroller of its own: the dialog body it sits in scrolls (CLAUDE.md §2). */}
      <div className="flex flex-col gap-1">
        {error ? <ErrorNote error={error} title="Couldn't list the collaborations" variant="line" /> : null}
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && !error && collaborations?.length === 0 && (
          <div className="text-sm text-muted-foreground">
            {search.trim() ? "No collaboration has that name: create it above." : "No collaborations yet: name one above."}
          </div>
        )}
        {collaborations?.map((collaboration) => {
          const { done, badge } = decorate?.(collaboration) ?? {};
          const isSelected = selected === collaboration.key;
          return (
            <Button
              key={collaboration.key}
              type="button"
              variant={isSelected ? "secondary" : "ghost"}
              className="justify-start gap-2"
              disabled={done || disabled}
              aria-pressed={isSelected}
              onClick={() => onPick({ key: collaboration.key, name: collaboration.name })}
            >
              {pending === collaboration.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done || isSelected ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span className="truncate">{collaboration.name}</span>
              {badge !== undefined && <span className="ml-auto">{badge}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
