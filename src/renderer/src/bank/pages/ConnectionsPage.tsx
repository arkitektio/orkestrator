import { DialogButton } from "@/core/ui/dialog-button";
import { BankConnection } from "@/bank/linkers";
import ConnectionList from "../components/lists/ConnectionList";

const ConnectionsPage = () => (
  <BankConnection.ListPage
    title="Connections"
    pageActions={
      <DialogButton name="banklink" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
        Link bank
      </DialogButton>
    }
  >
    <div className="p-3">
      <ConnectionList
        title=""
        emptyDescription="A connection is your consent at one bank. Link one to start syncing."
      />
    </div>
  </BankConnection.ListPage>
);

export default ConnectionsPage;
