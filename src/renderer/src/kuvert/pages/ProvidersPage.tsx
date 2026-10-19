import { DialogButton } from "@/core/ui/dialog-button";
import ProviderList from "../components/lists/ProviderList";
import { KUVERT_HELP } from "../help";
import { MailProvider } from "../linkers";

const AddProviderButton = ({ variant }: { variant?: "outline" }) => (
  <DialogButton name="kuvertcreateprovider" size="sm" variant={variant} dialogProps={{}} options={{ size: "medium" }}>
    Add provider
  </DialogButton>
);

/** The providers the organization set up; every mailbox is linked through one (admins). */
const ProvidersPage = () => (
  <MailProvider.ListPage help={KUVERT_HELP.providers} title="Providers" pageActions={<AddProviderButton variant="outline" />}>
    <div className="p-3">
      <ProviderList
        title=""
        emptyDescription="A provider is how your organization's members link their mailboxes: an IMAP server, or a Google or Microsoft sign-in."
        emptyActions={<AddProviderButton />}
      />
    </div>
  </MailProvider.ListPage>
);

export default ProvidersPage;
