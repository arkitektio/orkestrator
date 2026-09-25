import {
  useLocalActionEntries,
  usePinnedActionIds,
  useTogglePinnedAction,
} from "@/core/app/localactions";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import type { Action } from "@/core/lib/localactions/LocalActionProvider";
import { Pin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SettingsPage } from "../components/SettingsPage";

/** Which local actions sit pinned at the top of the command palette. Not a settings-form field: pins have their own store. */
export const PalettePage = () => {
  const localActionEntries = useLocalActionEntries();
  const pinnedActionIds = usePinnedActionIds();
  const togglePinnedAction = useTogglePinnedAction();
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () =>
      [...localActionEntries].sort((left, right) => {
        const leftPinned = pinnedActionIds.includes(left.id);
        const rightPinned = pinnedActionIds.includes(right.id);
        if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
        return left.action.title.localeCompare(right.action.title);
      }),
    [localActionEntries, pinnedActionIds],
  );

  const term = search.toLowerCase();
  const filtered = term
    ? sorted.filter(
        ({ id, action }) =>
          id.toLowerCase().includes(term) ||
          action.title.toLowerCase().includes(term) ||
          action.description.toLowerCase().includes(term),
      )
    : sorted;

  return (
    <SettingsPage slug="palette">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5" />
            Pinned actions
          </CardTitle>
          <CardDescription>
            Pinned actions appear first in the command palette, before anything is typed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {pinnedActionIds.length > 0 ? (
              sorted
                .filter(({ id }) => pinnedActionIds.includes(id))
                .map(({ id, action }) => (
                  <Badge key={id} variant="secondary" className="gap-1 px-3 py-1">
                    {action.title}
                  </Badge>
                ))
            ) : (
              <p className="text-sm text-muted-foreground">No actions are pinned yet.</p>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search actions by title, description, or id"
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-72 rounded-md border">
            <div className="space-y-2 p-3">
              {filtered.map(({ id, action }) => {
                const isPinned = pinnedActionIds.includes(id);
                const isRequiredPin = (action as Action).pinned === true;
                return (
                  <div
                    key={id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-background/60 p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium leading-none">{action.title}</p>
                        {isPinned ? <Badge variant="default">Pinned</Badge> : null}
                        {isRequiredPin ? <Badge variant="secondary">Always</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                      <p className="text-xs text-muted-foreground">{id}</p>
                    </div>
                    <Button
                      type="button"
                      variant={isPinned ? "default" : "outline"}
                      disabled={isRequiredPin}
                      onClick={() => togglePinnedAction(id)}
                    >
                      {isRequiredPin ? "Always pinned" : isPinned ? "Unpin" : "Pin"}
                    </Button>
                  </div>
                );
              })}
              {filtered.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No actions matched the current filter.
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </SettingsPage>
  );
};

export default PalettePage;
