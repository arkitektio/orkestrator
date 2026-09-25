import { useGraphQLDialog } from "@/core/app/hooks/useGraphQLDialog";
import { StringField } from "@/core/components/fields/StringField";
import { Button } from "@/core/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { useForm } from "react-hook-form";
import { githubIdentifier, parseGithubIdentifier } from "../repoLink";
import {
  CreateGithubRepoMutation,
  ListDefinitionsDocument,
  ListReleasesDocument,
  ListReposDocument,
  useCreateGithubRepoMutation,
} from "../api/graphql";

type Values = { identifier: string };

/**
 * Add a GitHub repository to Kabinet.
 *
 * The one field takes whatever names the repository — `user/repo`, the browser
 * URL, the clone URL — and `parseGithubIdentifier` reduces it to the `user/repo`
 * the mutation wants, so pasting the address bar works. `identifier` prefills it,
 * which is how the install deeplink (`/kabinet/repos/install`) hands a repo over.
 */
export const CreateRepoForm = (props: {
  identifier?: string;
  onSuccess?: (data: CreateGithubRepoMutation | null | undefined) => void;
}) => {
  const [add, { loading }] = useCreateGithubRepoMutation({
    refetchQueries: [ListReposDocument, ListReleasesDocument, ListDefinitionsDocument],
  });

  const submit = useGraphQLDialog(add, { successMessage: "Repo added", onSuccess: props.onSuccess });

  const form = useForm<Values>({ defaultValues: { identifier: props.identifier ?? "" } });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          const coordinates = parseGithubIdentifier(data.identifier);
          if (!coordinates) {
            form.setError("identifier", {
              message: "That does not look like a GitHub repository. Try 'user/repo'.",
            });
            return;
          }
          await submit({ variables: { identifier: githubIdentifier(coordinates) } });
        })}
      >
        <DialogHeader>
          <DialogTitle>Add a GitHub repo</DialogTitle>
          <DialogDescription className="font-light text-sm mt-2">
            Kabinet reads the repository's manifest and offers every app it finds there as a
            flavour you can run. Nothing is installed on your machine.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <StringField
            label="Repository"
            name="identifier"
            placeholder="jhnnsrs/orkestrator"
            description="The repository as 'user/repo', or just paste its GitHub URL."
          />
        </div>

        <DialogFooter className="mt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add repo"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
