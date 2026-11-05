import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { useForm } from "react-hook-form";
import { CreateProjectMutation, ProjectsDocument, useCreateProjectMutation } from "../../api/graphql";

type Values = { name: string; description: string };

/** A new project: one piece of work, e.g. a study or one round of annotation. Todo lists hang off it. */
export const CreateProjectForm = (props: { onSuccess?: (data: CreateProjectMutation) => void }) => {
  const [create, { loading }] = useCreateProjectMutation({ refetchQueries: [ProjectsDocument] });
  const submit = useGraphQLDialog(create, {
    errorTitle: "Couldn't create the project",
    onSuccess: (data) => data && props.onSuccess?.(data),
  });
  const form = useForm<Values>({ defaultValues: { name: "", description: "" } });

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) =>
          submit({ variables: { input: { name: values.name, description: values.description || null } } }),
        )}
      >
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>A project is one piece of work, for example a study or one round of annotation. Its todo lists hang off it.</DialogDescription>
        </DialogHeader>
        <StringField name="name" label="Name" placeholder="Annotation round 1" />
        <ParagraphField name="description" label="Description" description="What the project is about (optional)" />
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            Create
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CreateProjectForm;
