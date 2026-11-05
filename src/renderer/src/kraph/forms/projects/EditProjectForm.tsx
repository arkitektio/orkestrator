import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { ErrorNote } from "@/core/ui/error-note";
import { Form } from "@/core/ui/form";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { useForm } from "react-hook-form";
import { ListProjectFragment, useProjectQuery, useUpdateProjectMutation } from "../../api/graphql";

type Values = { name: string; description: string };

const EditProjectFields = ({ project }: { project: ListProjectFragment }) => {
  // The answer is the project; the cache updates every page showing it, so no refetch.
  const [update, { loading }] = useUpdateProjectMutation();
  const submit = useGraphQLDialog(update, { errorTitle: "Couldn't save the project" });
  const form = useForm<Values>({
    defaultValues: { name: project.name, description: project.description ?? "" },
  });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) =>
          submit({
            variables: {
              input: { id: project.id, name: values.name, description: values.description || null },
            },
          }),
        )}
      >
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Rename the project or say what it is about.</DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" placeholder="Annotation round 1" />
        <ParagraphField name="description" label="Description" description="What the project is about (optional)" />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Rename a project and change its description. Opened by id (from the project
 * page or the "Edit project…" local action), so it reads the project itself —
 * from the cache when the page already has it.
 */
export const EditProjectForm = ({ id }: { id: string }) => {
  const { data, error } = useProjectQuery({ variables: { id }, fetchPolicy: "cache-first" });
  if (error) return <ErrorNote error={error} title="Couldn't load the project" />;
  if (!data) return null;
  return <EditProjectFields project={data.project} />;
};

export default EditProjectForm;
