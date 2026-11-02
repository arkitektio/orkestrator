import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { Button } from "@/core/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { useState } from "react";
import { DetailLensFragment, useGetLensQuery, useSetPositionLabelMutation } from "../api/graphql";
import { describeLens, lensPins, pinSummary } from "../lenses";

/**
 * Name what a lens pins, or take the name away.
 *
 * A lens has no name of its own: it is one row per selection, and a name
 * belongs to what is selected. So this names the positions the lens holds to
 * one value — a channel, a frame — and every lens through them is called by it:
 * the crops of the channel, the layer a scene draws it with. Cleared, the
 * positions read as what ingest recorded for them (a channel label), if
 * anything. A lens that pins nothing has nothing to name: a crop is named by the
 * shape it was cut to, the container by its own name.
 */
export const RenameLensForm = (props: { lens: string }) => {
  const { data, error, refetch } = useGetLensQuery({ variables: { id: props.lens } });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return <NamePositionsFields lens={data.lens} />;
};

const NamePositionsFields = ({ lens }: { lens: DetailLensFragment }) => {
  const [name, setName] = useState(lens.name ?? "");
  const { label, container } = describeLens(lens);
  const pins = lensPins(lens);

  // `SetPositionLabel` selects `id`, `name` and `label`, so Apollo writes the new
  // name into this lens; the other lenses through the same positions arrive
  // renamed through `WatchLenses`.
  const [setPositionLabel, { loading }] = useSetPositionLabelMutation();
  const submit = useGraphQLDialog(setPositionLabel, { errorTitle: "Couldn't name the lens" });

  if (pins.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Nothing to name</DialogTitle>
          <DialogDescription>
            This lens holds no axis of {container.name} to a single position, so
            there is nothing for a name to stand on. A crop is named by the
            annotation it was cut to, and the whole {container.name} by its own
            name. Cut a lens that pins a channel or a frame to name that.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 font-mono text-xs text-muted-foreground">{label}</div>
      </>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit({ variables: { lens: lens.id, label: name.trim() || null } });
      }}
    >
      <DialogHeader>
        <DialogTitle>Name {pinSummary(pins)}</DialogTitle>
        <DialogDescription>
          What to call {pinSummary(pins)} of {container.name}. Every lens through
          it is called by this name, its crops and the layers drawing it too.
          Leave it empty to go back to what was recorded for it.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 py-4">
        <Input
          autoFocus
          aria-label="Name"
          placeholder="e.g. GFP"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="font-mono text-xs text-muted-foreground">{label}</div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
};
