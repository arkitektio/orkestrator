import { DialogError } from "@/core/dialogs/DialogError";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import {
  BlokFragment,
  MaterializedBlokFragment,
  useForkBlokMutation,
  useMaterializedBlokQuery,
} from "@/rekuest/api/graphql";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { rematerializeMappings } from "../components/blokRematerialize";
import { MaterializeBlokForm } from "../forms/MaterializeBlokForm";

/**
 * A blok an app provides is materialized by its agents only, so a fork of it
 * is made first; it stays in the dialog and is materialized next.
 */
const ForkStep = (props: { blok: BlokFragment; onForked: (fork: BlokFragment) => void }) => {
  const { closeDialog } = useDialog();
  const [name, setName] = useState(`${props.blok.name} copy`);
  const [forkBlok] = useForkBlokMutation({ refetchQueries: ["ListBloks"] });

  const { submit, submitting } = useDialogSubmit(
    async () => {
      const { data } = await forkBlok({ variables: { input: { id: props.blok.id, name: name.trim() } } });
      if (!data) throw new Error("The fork came back empty");
      return data.forkBlok;
    },
    { errorTitle: "Couldn't fork the blok", onSuccess: props.onForked, close: false },
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Rematerialize {props.blok.name}</DialogTitle>
        <DialogDescription>
          Its app's agents keep this blok and materialize it themselves. Fork it into a custom
          blok first; the fork is then materialized with the same agents.
        </DialogDescription>
      </DialogHeader>

      <Input
        value={name}
        aria-label="Name of the fork"
        autoFocus
        onChange={(event) => setName(event.target.value)}
      />
      <DialogError />

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !name.trim()}>
          Fork
        </Button>
      </DialogFooter>
    </form>
  );
};

const MaterializeStep = (props: {
  materializedBlok: MaterializedBlokFragment;
  blok: BlokFragment;
  forked: boolean;
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const prefilledMappings = useMemo(
    () => rematerializeMappings(props.materializedBlok.agentMappings, props.blok.dependencies),
    [props.materializedBlok.agentMappings, props.blok.dependencies],
  );

  return (
    <div className="flex flex-col">
      <DialogHeader>
        <DialogTitle>Rematerialize {props.blok.name}</DialogTitle>
        <DialogDescription>
          {props.forked ? "Forked. " : ""}
          {props.blok.dependencies.length > 0
            ? "The agents it was bound to are filled in; change any, then materialize it."
            : "It depends on no agent, so it is ready to materialize."}
        </DialogDescription>
      </DialogHeader>
      <MaterializeBlokForm
        blokId={props.blok.id}
        dependencies={props.blok.dependencies}
        prefilledMappings={prefilledMappings}
        onMaterialized={(materialized) => {
          closeDialog();
          navigate(RekuestMaterializedBlok.linkBuilder(materialized.id));
        }}
      />
    </div>
  );
};

/**
 * A new materialization of the blok a materialized blok was made from, bound
 * to the same agents to start with. The one it starts from stays as it is.
 */
export const RematerializeBlokDialog = (props: { id: string }) => {
  const { data, error, refetch } = useMaterializedBlokQuery({ variables: { id: props.id } });
  const [fork, setFork] = useState<BlokFragment | null>(null);

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  const materializedBlok = data?.materializedBlok;
  if (!materializedBlok) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  const blok = fork ?? materializedBlok.blok;
  if (blok.provided) return <ForkStep blok={blok} onForked={setFork} />;

  return <MaterializeStep materializedBlok={materializedBlok} blok={blok} forked={fork !== null} />;
};
