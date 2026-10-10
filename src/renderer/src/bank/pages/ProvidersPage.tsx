import { DialogButton } from "@/core/ui/dialog-button";
import { BankProvider } from "@/bank/linkers";
import ProviderList from "../components/lists/ProviderList";
import { BANK_HELP } from "../help";

/** The providers the organization set up; banks and brokers are linked through one (admins). */
const ProvidersPage = () => (
  <BankProvider.ListPage
    help={BANK_HELP.providers}
    title="Providers"
    pageActions={
      <DialogButton name="bankcreateprovider" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
        Add provider
      </DialogButton>
    }
  >
    <div className="p-3">
      <ProviderList
        title=""
        emptyDescription="A provider is how your organization reaches banks and brokers. Set one up so members can link their accounts."
      />
    </div>
  </BankProvider.ListPage>
);

export default ProvidersPage;
