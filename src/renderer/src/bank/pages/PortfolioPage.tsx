import { PageLayout } from "@/core/layout/PageLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { BankAccount } from "@/bank/linkers";
import { LineChart } from "lucide-react";
import { useMemo } from "react";
import { Provider, usePortfolioQuery } from "../api/graphql";
import { PortfolioOverview } from "../components/holdings/PortfolioOverview";
import { formatMoney } from "../format";

/**
 * Every depot's positions as one portfolio. A security held in two depots is
 * one line; the depots themselves are listed underneath.
 */
const PortfolioPage = () => {
  const { data } = usePortfolioQuery();
  // The query asks for depots only (`kind: DEPOT`).
  const depots = useMemo(() => data?.bankAccounts ?? [], [data]);
  const holdings = useMemo(() => depots.flatMap((depot) => depot.currentHoldings), [depots]);

  return (
    <PageLayout
      title="Portfolio"
      pageActions={
        <DialogButton
          name="banklink"
          size="sm"
          variant="outline"
          dialogProps={{ provider: Provider.Scalable }}
          options={{ size: "medium" }}
        >
          Link Scalable
        </DialogButton>
      }
    >
      {data && depots.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
          <LineChart className="h-10 w-10 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">No depot linked</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Log in to Scalable Capital and your positions, trades and payouts sync here.
            </p>
          </div>
          <DialogButton name="banklink" dialogProps={{ provider: Provider.Scalable }} options={{ size: "medium" }}>
            Link Scalable Capital
          </DialogButton>
        </div>
      ) : (
        <div className="flex flex-col gap-8 p-6">
          <PortfolioOverview holdings={holdings} />
          {depots.length > 1 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Depots</h2>
              <div className="flex flex-col divide-y text-sm">
                {depots.map((depot) => (
                  <div key={depot.id} className="flex items-center justify-between gap-3 py-1.5">
                    <BankAccount.DetailLink object={depot} className="truncate">
                      {depot.name || "Depot"}
                    </BankAccount.DetailLink>
                    <span className="tabular-nums text-muted-foreground">
                      {depot.latestBalance
                        ? formatMoney(depot.latestBalance.amount, depot.latestBalance.currency)
                        : `${depot.currentHoldings.length} positions`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default PortfolioPage;
