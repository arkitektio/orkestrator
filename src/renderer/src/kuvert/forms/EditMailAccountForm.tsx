import { Spinner } from "@/core/ui/spinner";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { SwitchField } from "@/core/forms/SwitchField";
import { ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AuthMethod,
  MailAccountFragment,
  MailboxTreeDocument,
  Protocol,
  Security,
  useGetMailAccountQuery,
  useUpdateMailAccountMutation,
} from "../api/graphql";
import { toastText } from "../errors";
import { PasswordField, ServerFields, serverInput, ServerValues, TextField } from "./fields";

type Values = {
  name: string;
  displayName: string;
  password: string;
  username: string;
  incoming: ServerValues;
  smtp: ServerValues;
  smtpUsername: string;
  smtpPassword: string;
  saveSentCopy: boolean;
  popLeaveOnServer: boolean;
};

const Edit = ({ account }: { account: MailAccountFragment }) => {
  const { closeDialog } = useDialog();
  const [update, { loading }] = useUpdateMailAccountMutation({ refetchQueries: [MailboxTreeDocument] });
  const password = account.authMethod === AuthMethod.Password;
  const form = useForm<Values>({
    defaultValues: {
      name: account.name,
      displayName: account.displayName,
      password: "",
      username: account.username,
      incoming: { host: account.incomingHost, port: account.incomingPort, security: account.incomingSecurity },
      smtp: { host: account.smtpHost ?? "", port: account.smtpPort ?? 465, security: account.smtpSecurity ?? Security.Tls },
      smtpUsername: "",
      smtpPassword: "",
      saveSentCopy: account.saveSentCopy,
      popLeaveOnServer: account.popLeaveOnServer,
    },
  });

  // Only what changed is sent: the server tests a new login before keeping it.
  const submit = (v: Values) => {
    const dirty = form.formState.dirtyFields;
    return update({
      variables: {
        input: {
          id: account.id,
          name: dirty.name ? v.name.trim() : undefined,
          displayName: dirty.displayName ? v.displayName.trim() : undefined,
          password: v.password || undefined,
          username: dirty.username ? v.username.trim() : undefined,
          incoming: dirty.incoming ? serverInput(v.incoming) : undefined,
          smtp: dirty.smtp ? serverInput(v.smtp) : undefined,
          smtpUsername: v.smtpUsername.trim() || undefined,
          smtpPassword: v.smtpPassword || undefined,
          saveSentCopy: dirty.saveSentCopy ? v.saveSentCopy : undefined,
          popLeaveOnServer: dirty.popLeaveOnServer ? v.popLeaveOnServer : undefined,
        },
      },
    })
      .then(() => {
        toast.success("Mailbox updated");
        closeDialog();
      })
      .catch((e) => toast.error(toastText(e)));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Edit {account.emailAddress}</DialogTitle>
          <DialogDescription>A new password or new servers are tested before they are kept.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <TextField name="name" label="Name" />
          <TextField name="displayName" label="Sender name" />
        </div>
        {password && <PasswordField name="password" label="New password" description="Leave empty to keep the current one." />}
        <SwitchField name="saveSentCopy" label="Keep a copy in Sent" />
        {account.protocol === Protocol.Pop3 && <SwitchField name="popLeaveOnServer" label="Keep mail on the server" />}
        {password && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" />
              Servers
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <ServerFields prefix="incoming" label={account.protocol === Protocol.Pop3 ? "POP3" : "IMAP"} />
              <TextField name="username" label="Username" />
              <ServerFields prefix="smtp" label="SMTP" />
              <div className="grid grid-cols-2 gap-2">
                <TextField name="smtpUsername" label="SMTP username" placeholder="unchanged" />
                <PasswordField name="smtpPassword" label="SMTP password" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading || !form.formState.isDirty}>
            {loading ? "Testing…" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Change a mailbox's names, credentials or servers (owner only). */
export const EditMailAccountForm = ({ id }: { id: string }) => {
  const { data } = useGetMailAccountQuery({ variables: { id } });
  if (!data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;
  return <Edit account={data.mailAccount} />;
};
