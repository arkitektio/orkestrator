import { DialogButton } from "@/core/ui/dialog-button";
import MailAccountList, { AddMailboxButton } from "../components/lists/MailAccountList";
import { KUVERT_HELP } from "../help";
import { MailAccount } from "../linkers";

const AccountsPage = () => (
  <MailAccount.ListPage
    title="Mailboxes"
    help={KUVERT_HELP.accounts}
    pageActions={
      <DialogButton name="kuvertlink" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
        Add mailbox
      </DialogButton>
    }
  >
    <div className="p-3">
      <MailAccountList
        title=""
        emptyDescription="Add a mailbox to read and send its mail here."
        emptyActions={<AddMailboxButton />}
      />
    </div>
  </MailAccount.ListPage>
);

export default AccountsPage;
