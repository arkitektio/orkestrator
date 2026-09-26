import { PageAction } from "@/core/ui/page-action";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankRule } from "@/bank/linkers";
import { toast } from "sonner";
import { ListTransactionsDocument, useReapplyRulesMutation } from "../api/graphql";
import RuleList from "../components/lists/RuleList";

const RulesPage = () => {
  const [reapply, { loading }] = useReapplyRulesMutation({ refetchQueries: [ListTransactionsDocument] });
  return (
    <BankRule.ListPage
      title="Rules"
      pageActions={
        <>
          <DialogButton name="bankcreaterule" size="sm" variant="outline" dialogProps={{}} options={{ size: "medium" }}>
            New rule
          </DialogButton>
          <PageAction
            size="sm"
            priority={-10}
            disabled={loading}
            title="Run every rule over existing transactions (never over ones you categorized by hand)"
            onClick={() =>
              reapply()
                .then((r) => toast.success(`${r.data?.reapplyRules ?? 0} transactions re-categorized`))
                .catch((e: Error) => toast.error(e.message))
            }
          >
            {loading ? "Applying..." : "Reapply rules"}
          </PageAction>
        </>
      }
    >
      <div className="p-3">
        <RuleList
          title=""
          defaultLimit={100}
          emptyDescription="Rules sort new transactions into categories. Make one from any transaction."
        />
      </div>
    </BankRule.ListPage>
  );
};

export default RulesPage;
