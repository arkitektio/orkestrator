import { DialogButton } from "@/core/ui/dialog-button";
import { BankAccount } from "@/bank/linkers";
import AccountList from "../components/lists/AccountList";

const AccountsPage = () => (
  <BankAccount.ListPage
    title="Accounts"
    pageActions={
      <DialogButton name="banklink" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
        Link bank
      </DialogButton>
    }
  >
    <div className="p-3">
      <AccountList title="" emptyDescription="Link a bank to see its accounts here." />
    </div>
  </BankAccount.ListPage>
);

export default AccountsPage;
