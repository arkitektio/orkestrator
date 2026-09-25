import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import {
  CreateFolderInput,
  useCreateFolderMutation
} from "../api/graphql";

export const CreateFolderForm = (props: { parentFolderId?: string }) => {
    const [createFolder] = useCreateFolderMutation({
        refetchQueries: ["Children", "GetFolders"],
    });

    const submit = useGraphQLDialog(createFolder, { successMessage: "Folder created" });

    const form = useForm<CreateFolderInput>({
        defaultValues: {
            name: "New Folder",
        },
    });

    return (
        <>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(async (data) => {
                        submit({
                            variables: {
                                input: {
                                    name: data.name,
                                    ...(props.parentFolderId && { parent: props.parentFolderId }),
                                },
                            },
                        });
                    })}
                >
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                            Create a new folder {props.parentFolderId ? 'inside the current folder' : 'in the root level'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 py-4">
                        <StringField
                            label="Folder Name"
                            name="name"
                            description="Enter a name for the new folder"
                            placeholder="My New Folder"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit">Create Folder</Button>
                    </DialogFooter>
                </form>
            </Form>
        </>
    );
};
