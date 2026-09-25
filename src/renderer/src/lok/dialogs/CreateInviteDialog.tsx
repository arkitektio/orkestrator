import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const [createInvite] = useCreateInviteMutation({
    refetchQueries: ['Organization']
  });

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

  const onSubmit = (values: z.output<typeof formSchema>) => {
    createInvite({
      variables: {
        input: {
          organization: organizationId,
          expiresInDays: values.expiresInDays,
          roles: values.roles,
        },
      },
    }).then(() => {
      onOpenChange(false);
      form.reset();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <DialogFooter>
              <Button type="submit">Create Invite</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
