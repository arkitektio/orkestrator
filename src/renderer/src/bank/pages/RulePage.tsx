import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Switch } from "@/core/ui/switch";
import Timestamp from "@/core/ui/timestamp";
import { BankRule } from "@/bank/linkers";
import { toast } from "sonner";
import { ListTransactionsDocument, useGetCategoryRuleQuery, useUpdateCategoryRuleMutation } from "../api/graphql";
import { ruleSentence } from "../components/cards/RuleCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { InfoList } from "../components/InfoList";
import { toNumber } from "../format";

const RulePage = asDetailQueryRoute(useGetCategoryRuleQuery, ({ data }) => {
  const rule = data.categoryRule;
  const [update, { loading }] = useUpdateCategoryRuleMutation({ refetchQueries: [ListTransactionsDocument] });

  return (
    <BankRule.ModelPage title="Rule" object={rule}>
      <div className="p-6 flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-lg">When {ruleSentence(rule)}</p>
          <p className="flex items-center gap-2 text-lg">
            → <CategoryBadge category={rule.category} className="text-lg" />
          </p>
        </div>
        <label className="flex items-center justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="text-sm">Active</span>
            <span className="text-xs text-muted-foreground">
              Switching re-runs the rules over existing transactions. Ones you categorized by hand stay.
            </span>
          </span>
          <Switch
            checked={rule.active}
            disabled={loading}
            onCheckedChange={(active) =>
              update({ variables: { input: { id: rule.id, active } } }).catch((e: Error) => toast.error(e.message))
            }
          />
        </label>
        <InfoList
          rows={[
            ["Priority", `#${rule.priority} (lower runs first)`],
            // Rule bounds are on the absolute amount and carry no currency.
            ["At least", rule.amountMin && toNumber(rule.amountMin).toLocaleString()],
            ["At most", rule.amountMax && toNumber(rule.amountMax).toLocaleString()],
            ["Created", <Timestamp date={rule.createdAt} relative />],
          ]}
        />
      </div>
    </BankRule.ModelPage>
  );
});

export default RulePage;
