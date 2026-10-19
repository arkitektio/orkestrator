import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/ui/form";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateInviteMutation } from "../api/graphql";

const formSchema = z.object({
  expiresInDays: z.coerce.number().min(1).default(1),
  roles: z.array(z.string()).default([]),
});

interface CreateInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  availableRoles: { identifier: string; id: string }[];
}

export const CreateInviteDialog = ({
  open,
  onOpenChange,
  organizationId,
  availableRoles,
}: CreateInviteDialogProps) => {
  const [createInvite, { loading }] = useCreateInviteMutation({
    refetchQueries: ['Organization']
  });
  // Not a registry dialog, so it holds its own failure; the new invite shows
  // in the page's list, so success needs no toast.
  const [error, setError] = useState<unknown>(null);

  const form = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expiresInDays: 1,
      roles: [],
    },
  });

  const onSubmit = async (values: z.output<typeof formSchema>) => {
    setError(null);
    try {
      await createInvite({
        variables: {
          input: {
            organization: organizationId,
            expiresInDays: values.expiresInDays,
            roles: values.roles,
          },
        },
      });
      onOpenChange(false);
      form.reset();
    } catch (e) {
      setError(e);
    }
  };

  const onDialogOpenChange = (next: boolean) => {
    if (!next) setError(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invite</DialogTitle>
          <DialogDescription>
            Create a new invite link for this organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="expiresInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires in (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={
                        typeof field.value === "string" ||
                        typeof field.value === "number"
                          ? field.value
                          : ""
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Roles</FormLabel>
                  </div>
                  {availableRoles.map((role) => (
                    <FormField
                      key={role.id}
                      control={form.control}
                      name="roles"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={role.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.identifier)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), role.identifier])
                                    : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== role.identifier
                                      )
                                    );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {role.identifier}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
            <ErrorNote error={error} title="Couldn't create the invite" />
            <DialogFooter>
              <Button type="submit" disabled={loading}>Create Invite</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
