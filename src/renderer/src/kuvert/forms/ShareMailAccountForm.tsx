import { Spinner } from "@/core/ui/spinner";
import { useDialog } from "@/core/dialogs/registry";
import { ListSearchField } from "@/core/forms/ListSearchField";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  MailAccountFragment,
  Visibility,
  useGetMailAccountQuery,
  useShareMailAccountMutation,
} from "../api/graphql";
import { toastText } from "../errors";
import { SelectField } from "./fields";

type Values = { visibility: Visibility; users: string[] };

const Share = ({ account }: { account: MailAccountFragment }) => {
  const { closeDialog } = useDialog();
  const searchUsers = useStructureOptions("@lok/user");
  const [share, { loading }] = useShareMailAccountMutation();
  const form = useForm<Values>({
    defaultValues: { visibility: account.visibility, users: account.sharedWith.map((u) => u.id) },
  });
  const visibility = form.watch("visibility");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) =>
          share({
            variables: {
              input: { id: account.id, visibility: v.visibility, users: v.visibility === Visibility.Shared ? v.users : null },
            },
          })
            .then(() => {
              toast.success("Sharing updated");
              closeDialog();
            })
            .catch((e) => toast.error(toastText(e))),
        )}
        className="flex flex-col gap-3"
      >
        <DialogHeader>
          <DialogTitle>Share {account.emailAddress}</DialogTitle>
          <DialogDescription>Who sees this mailbox and its mail. Only you can change its credentials.</DialogDescription>
        </DialogHeader>
        <SelectField
          name="visibility"
          label="Visible to"
          options={[
            { value: Visibility.Private, label: "Only me" },
            { value: Visibility.Shared, label: "Me and the members I pick" },
            { value: Visibility.Organization, label: "Everyone in the organization" },
          ]}
        />
        {visibility === Visibility.Shared && searchUsers && (
          <ListSearchField name="users" label="Members" search={searchUsers} placeholder="Pick members" />
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Set who sees a mailbox (owner only). */
export const ShareMailAccountForm = ({ id }: { id: string }) => {
  const { data } = useGetMailAccountQuery({ variables: { id } });
  if (!data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;
  return <Share account={data.mailAccount} />;
};
