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
const ForkStep = (props: { blok: BlokFragment; title: string; onForked: (fork: BlokFragment) => void }) => {
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
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>
          Its app's agents keep this template and change it with their registrations. Fork it into a
          template of your own first; a blok is then made of the fork, on the same agents.
        </DialogDescription>
      </DialogHeader>

      <Input
        value={name}
        aria-label="Name of your template"
        autoFocus
        onChange={(event) => setName(event.target.value)}
      />
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
  title: string;
  then?: "open" | "edit";
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const prefilledMappings = useMemo(
    () => rematerializeMappings(props.materializedBlok.agentMappings, props.blok.dependencies),
    [props.materializedBlok.agentMappings, props.blok.dependencies],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>
          {props.forked ? "Forked. " : ""}
          {props.blok.dependencies.length > 0
            ? "The agents it runs on are filled in; change any, then install it."
            : "It runs on no agent, so it is ready to install."}{" "}
          {props.materializedBlok.name || props.materializedBlok.blok.name} stays as it is.
        </DialogDescription>
      </DialogHeader>
      <MaterializeBlokForm
        blokId={props.blok.id}
        defaultName={props.materializedBlok.name || props.blok.name}
        dependencies={props.blok.dependencies}
        prefilledMappings={prefilledMappings}
        submitLabel={props.then === "edit" ? "Install and edit" : "Install"}
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

/**
 * A new blok of the template a blok was made from, on the same agents to
 * start with. The one it starts from stays as it is. With `then: "edit"` it
 * is how a blok an app provides is made your own to edit: forked, installed
 * again, and opened in the editor.
 */
export const RematerializeBlokDialog = (props: { id: string; then?: "open" | "edit" }) => {
  const { data, error, refetch } = useMaterializedBlokQuery({ variables: { id: props.id } });
  const [fork, setFork] = useState<BlokFragment | null>(null);

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  const materializedBlok = data?.materializedBlok;
  if (!materializedBlok) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  const blok = fork ?? materializedBlok.blok;
  const name = materializedBlok.name || materializedBlok.blok.name;
  const title = props.then === "edit" ? `Make ${name} your own` : `Install ${name} again`;
  if (blok.provided) return <ForkStep blok={blok} title={title} onForked={setFork} />;

  return (
    <MaterializeStep materializedBlok={materializedBlok} blok={blok} forked={fork !== null} title={title} then={props.then} />
  );
};
