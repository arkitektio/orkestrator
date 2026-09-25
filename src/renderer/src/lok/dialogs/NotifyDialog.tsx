import { useDialog } from "@/core/dialogs/registry";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useNotifyUserMutation } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type NotifyFormData = {
  title: string;
  message: string;
};

const plural = (n: number) => `${n} user${n === 1 ? "" : "s"}`;

/**
 * Lok's `notifyUser` pushes to every com channel (phone) the user registered.
 */
export const NotifyDialog = (props: { users: string[] }) => {
  const [notify] = useNotifyUserMutation();
  const { closeDialog } = useDialog();

  const form = useForm<NotifyFormData>({
    defaultValues: { title: "", message: "" },
  });

  const onSubmit = async ({ title, message }: NotifyFormData) => {
    if (!message.trim()) {
      form.setError("message", { message: "A message is required" });
      return;
    }
    const results = await Promise.allSettled(
      props.users.map((user) =>
        notify({ variables: { input: { user, title, message } } }),
      ),
    );
    // A rejection is a transport/permission error; `false` is lok declining
    // to deliver (e.g. no registered phone). Both count as not reached.
    const failed = results.filter(
      (r) => r.status === "rejected" || r.value.data?.notifyUser !== true,
    ).length;

    if (failed === 0) {
      toast.success(`Message sent to ${plural(props.users.length)}`);
      closeDialog();
    } else if (failed === props.users.length) {
      toast.error("The message could not be delivered");
    } else {
      toast.warning(`Sent to ${plural(props.users.length - failed)}, failed for ${plural(failed)}`);
      closeDialog();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Send message</DialogTitle>
          <DialogDescription>
            Pushed to the registered phones of {plural(props.users.length)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <StringField name="title" label="Title" placeholder="Optional" />
          <ParagraphField
            name="message"
            label="Message"
            placeholder="What should they know?"
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
