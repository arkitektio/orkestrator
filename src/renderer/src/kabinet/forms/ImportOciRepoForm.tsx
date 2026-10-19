import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { StringField } from "@/core/forms/StringField";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  AppStoreDocument,
  ImportRepoMutation,
  ListDefinitionsDocument,
  ListReleasesDocument,
  useImportRepoMutation,
} from "../api/graphql";

type Values = { reference: string; channels: string };

/**
 * The repository a reference names, or null when it names a tag or a digest.
 *
 * Mirrors kabinet's own check (`bridge/repo/oci.py:parse_reference`) so the
 * mistake is shown on the field; the server checks again.
 */
const repositoryReference = (raw: string): string | null => {
  const reference = raw.trim().replace(/^oci:\/\//, "").replace(/^https:\/\//, "");
  const last = reference.split("/").pop() ?? "";
  if (!reference || reference.includes("@") || last.includes(":")) return null;
  return reference;
};

/**
 * Import an OCI repository (e.g. `ghcr.io/org/app`) into Kabinet.
 *
 * Kabinet reads every tag of the repository that carries an arkitekt release
 * descriptor and offers its flavours. Importing one again reads it again, so
 * this doubles as "check for new releases".
 */
export const ImportOciRepoForm = (props: {
  reference?: string;
  onSuccess?: (data: ImportRepoMutation | null | undefined) => void;
}) => {
  const [importRepo, { loading }] = useImportRepoMutation({
    refetchQueries: [ListReleasesDocument, ListDefinitionsDocument, AppStoreDocument],
  });
  const { submit } = useDialogSubmit(
    (reference: string, channels: string[]) =>
      importRepo({ variables: { reference, channels: channels.length ? channels : undefined } }),
    {
      errorTitle: "Couldn't import the repository",
      onSuccess: (result) => {
        // Importing again is how new releases are found: the count is news.
        const repo = result.data?.importRepo;
        const count = repo?.flavours.length ?? 0;
        toast.success(`Imported ${repo?.name ?? "the repository"}: ${count} flavour${count === 1 ? "" : "s"}`);
        props.onSuccess?.(result.data);
      },
    },
  );

  const form = useForm<Values>({ defaultValues: { reference: props.reference ?? "", channels: "" } });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          const reference = repositoryReference(data.reference);
          if (!reference) {
            form.setError("reference", {
              message: "Name the repository alone, without a tag or a digest, e.g. 'ghcr.io/org/app'.",
            });
            return;
          }
          const channels = data.channels
            .split(",")
            .map((channel) => channel.trim())
            .filter(Boolean);
          await submit(reference, channels);
        })}
      >
        <DialogHeader>
          <DialogTitle>Import from a container registry</DialogTitle>
          <DialogDescription className="font-light text-sm mt-2">
            Kabinet reads the repository's tags and offers every release published there as a
            flavour you can run. The registry is read anonymously, so the package has to be public.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <StringField
            label="Repository"
            name="reference"
            placeholder="ghcr.io/jhnnsrs/basiks"
            description="The repository on its registry, without a tag. Docker Hub needs no host."
          />
          <StringField
            label="Channels"
            name="channels"
            placeholder="main"
            description="Optional. Channel tags to follow besides the releases, separated by commas."
          />
        </div>

        <DialogFooter className="mt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
