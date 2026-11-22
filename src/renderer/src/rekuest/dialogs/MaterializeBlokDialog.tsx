import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { useGetBlokQuery } from "@/rekuest/api/graphql";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BLOK_CONTEXTS } from "../components/blokContexts";
import { MaterializeBlokForm } from "../forms/MaterializeBlokForm";

/**
 * Install a template: name the blok it makes, choose an agent for each one it
 * runs on, and open the blok. A template an app provides is installed by its
 * agents, so it is forked first.
 */
export const MaterializeBlokDialog = (props: {
  id: string;
  /** Said over the form when the dialog is the second step of something (an install from a repository or a file). */
  lead?: string;
  /** Open the new blok in the editor instead of on its page. */
  then?: "open" | "edit";
}) => {
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
            The app's agents install this template themselves. Fork it to run it on other agents.
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

  const context = BLOK_CONTEXTS[blok.context];
  const others = blok.materializedBloks.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Install {blok.name}</DialogTitle>
        <DialogDescription>
          {props.lead ? `${props.lead} ` : ""}
          {blok.dependencies.length > 0
            ? "Choose the agents it runs on. The blok it makes is live: its values follow them and its controls act on them."
            : "It runs on no agent, so it is ready to install."}
        </DialogDescription>
        {(context || others > 0) && (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {context && (
              <span className="flex items-center gap-1">
                <context.icon className="size-3" />
                {context.label}
              </span>
            )}
            {context && others > 0 && <span>·</span>}
            {others > 0 && <span>Installed {others === 1 ? "once" : `${others} times`} already</span>}
          </p>
        )}
      </DialogHeader>
      <MaterializeBlokForm
        blokId={blok.id}
        defaultName={blok.name}
        dependencies={blok.dependencies}
        onCancel={closeDialog}
        onMaterialized={(materialized) => {
          closeDialog();
          const page = RekuestMaterializedBlok.linkBuilder(materialized.id);
          navigate(props.then === "edit" ? `${page}/edit` : page);
        }}
      />
    </div>
  );
};
