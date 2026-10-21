import { DialogError } from "@/core/dialogs/DialogError";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { useOperation } from "@/core/modules/hooks/useOperation";
import type { JSONObject } from "@/core/types";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Loader2 } from "lucide-react";
import { useRepoBlokInstallQuery } from "../api/graphql";

/**
 * Install a blok a repository publishes: copy it into rekuest as a custom
 * blok that keeps its origin, then bind it to agents (rekuest's materialize
 * dialog). Installing again (`update`) replaces what the installed copy draws
 * in place; where it is materialized stays.
 */
export const InstallRepoBlokDialog = (props: { id: string; update?: boolean }) => {
  const { closeDialog, openDialog } = useDialog();
  const { data, error, refetch } = useRepoBlokInstallQuery({ variables: { id: props.id } });
  const installBlok = useOperation<{ id: string }>("rekuest.installBlok");

  const blok = data?.repoBlok;
  const { submit, submitting } = useDialogSubmit(
    async () => {
      if (!blok) throw new Error("The blok is still loading");
      return await installBlok(blok.installInput as JSONObject);
    },
    {
      errorTitle: props.update ? "Couldn't update the blok" : "Couldn't install the blok",
      // An update keeps its materializations; a new blok goes on to be bound.
      close: !!props.update,
      onSuccess: (installed) => {
        if (!props.update) openDialog("materializeblok", { id: installed.id });
      },
    },
  );

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  if (!blok) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {props.update ? "Update" : "Install"} {blok.name}
        </DialogTitle>
        <DialogDescription>
          {props.update
            ? "Its repository changed it. Updating replaces what your copy draws; where it is materialized stays as it is."
            : "It becomes a blok of your organization. Next, choose the agents it draws from."}
        </DialogDescription>
      </DialogHeader>
      <p className="break-all font-mono text-xs text-muted-foreground">{blok.origin}</p>
      <DialogError />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {props.update ? "Update" : "Install"}
        </Button>
      </DialogFooter>
    </form>
  );
};
