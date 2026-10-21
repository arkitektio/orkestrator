import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { useGetBlokQuery } from "@/rekuest/api/graphql";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MaterializeBlokForm } from "../forms/MaterializeBlokForm";

/**
 * Install a custom blok: bind each of its dependencies to an agent and
 * materialize it, then open what was made. A blok an app provides is
 * materialized by its agents, so it is forked first.
 */
export const MaterializeBlokDialog = (props: { id: string }) => {
  const { closeDialog, openDialog } = useDialog();
  const navigate = useNavigate();
  const { data, error, refetch } = useGetBlokQuery({ variables: { id: props.id } });

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  const blok = data?.blok;
  if (!blok) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  if (blok.provided) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{blok.name} comes with its app</DialogTitle>
          <DialogDescription>
            The app's agents materialize this blok themselves. Fork it to bind it to other agents.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          <Button onClick={() => openDialog("forkblok", { id: blok.id, name: blok.name })}>Fork</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <DialogHeader>
        <DialogTitle>Install {blok.name}</DialogTitle>
        <DialogDescription>
          {blok.dependencies.length > 0
            ? "Choose the agents it draws from, then materialize it."
            : "It depends on no agent, so it is ready to materialize."}
        </DialogDescription>
      </DialogHeader>
      <MaterializeBlokForm
        blokId={blok.id}
        dependencies={blok.dependencies}
        onMaterialized={(materialized) => {
          closeDialog();
          navigate(RekuestMaterializedBlok.linkBuilder(materialized.id));
        }}
      />
    </div>
  );
};
