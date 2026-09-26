import { createList } from "@/core/layout/createList";
import { DialogButton } from "@/core/ui/dialog-button";
import { useListMailAccountsQuery } from "../../api/graphql";
import { MailAccount } from "../../linkers";
import MailAccountCard from "../cards/MailAccountCard";

const MailAccountList = createList({
  useHook: useListMailAccountsQuery,
  dataKey: "mailAccounts",
  ItemComponent: MailAccountCard,
  title: "Mailboxes",
  emptyTitle: "No mailboxes yet",
  smart: MailAccount,
  minItemWidth: 260,
});

/** The empty state's way out: link the first mailbox. */
export const AddMailboxButton = () => (
  <DialogButton name="kuvertlink" dialogProps={{}} options={{ size: "medium" }} size="sm">
    Add mailbox
  </DialogButton>
);

export default MailAccountList;
