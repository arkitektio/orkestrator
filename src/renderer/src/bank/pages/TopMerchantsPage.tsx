import { PageLayout } from "@/core/layout/PageLayout";
import { useSpendingByMerchantQuery } from "../api/graphql";
import { PeriodPicker, usePeriod } from "../components/insights/period";
import { MerchantSectionNav } from "../components/merchants/MerchantSectionNav";
import { MerchantSpending } from "../components/merchants/MerchantSpending";

/** Where the money goes, ranked by merchant, over a chosen period. */
const TopMerchantsPage = () => {
  const { period, setPeriod, window } = usePeriod("quarter");
  const { data, loading } = useSpendingByMerchantQuery({
    variables: { dateFrom: window.dateFrom, limit: 50 },
  });
  const totals = data?.spendingByMerchant ?? [];

  return (
    <PageLayout title="Top merchants" pageActions={<PeriodPicker period={period} onPeriod={setPeriod} />}>
      <MerchantSectionNav className="mb-3" />
      <div className="max-w-2xl p-3">
        {totals.length > 0 ? (
          <MerchantSpending totals={totals} />
        ) : (
          <p className="text-sm text-muted-foreground">{loading ? "Loading…" : "No spending in this period."}</p>
        )}
      </div>
    </PageLayout>
  );
};

export default TopMerchantsPage;
