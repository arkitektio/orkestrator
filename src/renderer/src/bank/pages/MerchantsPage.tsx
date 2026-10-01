import { useDialog } from "@/core/dialogs/registry";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction } from "@/core/ui/page-action";
import { BankMerchant } from "@/bank/linkers";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MerchantList from "../components/lists/MerchantList";
import { MerchantMap } from "../components/map/MerchantMap";
import { MerchantSectionNav } from "../components/merchants/MerchantSectionNav";
import { BANK_HELP } from "../help";

/**
 * Merchants: on a map of their places (default), or as a searchable list —
 * online-only merchants appear only in the list. `?view=list` opens the list.
 */
const MerchantsPage = () => {
  const [params] = useSearchParams();
  const { openDialog } = useDialog();
  const view = params.get("view") === "list" ? "list" : "map";
  const [search, setSearch] = useState("");
  const filters = useMemo(() => (search.trim() ? { search: search.trim() } : undefined), [search]);

  return (
    <BankMerchant.ListPage
      help={BANK_HELP.merchants}
      title="Merchants"
      pageActions={
        <>
          {view === "list" && (
            <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search merchants…" />
          )}
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("bankcreatemerchant", {}, { size: "medium" })}
          >
            New merchant
          </PageAction>
        </>
      }
    >
      <MerchantSectionNav className="mb-3" />
      {view === "map" ? (
        <MerchantMap className="min-h-[400px] flex-1" />
      ) : (
        <MerchantList
          title=""
          filters={filters}
          defaultLimit={60}
          emptyDescription="Merchants are recognized from your transactions' counterparties."
        />
      )}
    </BankMerchant.ListPage>
  );
};

export default MerchantsPage;
