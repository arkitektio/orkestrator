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
import { DetailLensFragment, useGetLensQuery, useUpdateLensMutation } from "../api/graphql";
import { lensLabel } from "../lenses";

/**
 * Name a lens, or take its name away.
 *
 * The name is the one thing about a lens that can be edited: what it selects is
 * fixed, and a different selection is a different lens. A blank name clears it,
 * and the lens reads as "Whole array" or its slices again.
 */
export const RenameLensForm = (props: { lens: string }) => {
  const { data, error, refetch } = useGetLensQuery({ variables: { id: props.lens } });

  if (error) return <QueryError error={error} onRetry={() => refetch()} />;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return <RenameLensFields lens={data.lens} />;
};

const RenameLensFields = ({ lens }: { lens: DetailLensFragment }) => {
  const [name, setName] = useState(lens.name ?? "");

  // `UpdateLens` selects `id` and `name`, so Apollo writes the new name into the
  // normalized lens and every tile, row and title showing it follows.
  const [updateLens, { loading }] = useUpdateLensMutation();
  const submit = useGraphQLDialog(updateLens, { successMessage: "Lens renamed" });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit({ variables: { id: lens.id, name: name.trim() || null } });
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename lens</DialogTitle>
        <DialogDescription>
          A name for this selection of {lens.dataset.name}. Leave it empty to go
          back to showing what it selects.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2 py-4">
        <Input
          autoFocus
          aria-label="Lens name"
          placeholder="e.g. nucleus 3"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="font-mono text-xs text-muted-foreground">{lensLabel(lens)}</div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
};
