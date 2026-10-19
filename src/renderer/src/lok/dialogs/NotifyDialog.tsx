import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useNotifyUserMutation } from "@/lok/api/graphql";
import { useForm } from "react-hook-form";
import { toast } from "@/core/notify";

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

  const form = useForm<NotifyFormData>({
    defaultValues: { title: "", message: "" },
  });

  // Delivery is invisible from here, so it is always said: a toast when some
  // or all were reached, the dialog's own error (and it stays open) when none.
  const { submit, submitting } = useDialogSubmit(
    async ({ title, message }: NotifyFormData) => {
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

      if (failed === props.users.length) {
        const rejected = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
        throw rejected
          ? rejected.reason
          : new Error("Nobody could be reached. A recipient needs a registered phone to get messages.");
      }
      return failed;
    },
    {
      errorTitle: "Couldn't deliver the message",
      onSuccess: (failed) => {
        if (failed === 0) {
          toast.success(`Message sent to ${plural(props.users.length)}`);
        } else {
          toast.warning(`Sent to ${plural(props.users.length - failed)}, failed for ${plural(failed)}`);
        }
      },
    },
  );

  const onSubmit = (data: NotifyFormData) => {
    if (!data.message.trim()) {
      form.setError("message", { message: "A message is required" });
      return;
    }
    return submit(data);
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
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
