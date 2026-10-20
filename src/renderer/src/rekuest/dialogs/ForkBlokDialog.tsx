import { DialogError } from "@/core/dialogs/DialogError";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { RekuestBlok } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { useForkBlokMutation } from "@/rekuest/api/graphql";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Copy a blok an app provides into a custom one, to edit it or bind other
 * agents to it. The copy stays as it is whatever the providing agents do;
 * the new blok opens once it exists.
 */
export const ForkBlokDialog = (props: { id: string; name: string }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [name, setName] = useState(`${props.name} copy`);
  const [forkBlok] = useForkBlokMutation({ refetchQueries: ["ListBloks"] });

  const { submit, submitting } = useDialogSubmit(
    async () => {
      const { data } = await forkBlok({ variables: { input: { id: props.id, name: name.trim() } } });
      return data?.forkBlok.id;
    },
    {
      errorTitle: "Couldn't fork the blok",
      onSuccess: (id) => {
        if (id) navigate(RekuestBlok.linkBuilder(id));
      },
    },
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
        <DialogTitle>Fork {props.name}</DialogTitle>
        <DialogDescription>
          An app's agents keep this blok in step with their registrations, so it can't be
          changed by hand. A fork is yours: edit it, or materialize it with other agents.
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
