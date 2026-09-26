import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ListRender } from "@/core/layout/ListRender";
import { PageAction } from "@/core/ui/page-action";
import { BankAccount, BankRecurring } from "@/bank/linkers";
import { Check, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { RecurringStatus, useGetRecurringPaymentQuery, useSetRecurringStatusMutation } from "../api/graphql";
import TransactionCard from "../components/cards/TransactionCard";
import { InfoList } from "../components/InfoList";
import { Money } from "../components/Money";
import { formatDay, formatIban, intervalLabel } from "../format";

const RecurringPaymentPage = asDetailQueryRoute(useGetRecurringPaymentQuery, ({ data }) => {
  const payment = data.recurringPayment;
  const [setStatus, { loading }] = useSetRecurringStatusMutation();
  const change = (status: RecurringStatus) =>
    setStatus({ variables: { input: { id: payment.id, status } } }).catch((e: Error) => toast.error(e.message));

  return (
    <BankRecurring.ModelPage
      title={payment.label}
      object={payment}
      pageActions={
        <>
          {payment.status !== RecurringStatus.Confirmed && (
            <PageAction size="sm" collapse="icon" icon={<Check className="h-4 w-4" />} disabled={loading} onClick={() => change(RecurringStatus.Confirmed)}>
              Confirm
            </PageAction>
          )}
          {payment.status !== RecurringStatus.Ignored && (
            <PageAction size="sm" collapse="icon" icon={<EyeOff className="h-4 w-4" />} disabled={loading} onClick={() => change(RecurringStatus.Ignored)} priority={-10}>
              Ignore
            </PageAction>
          )}
        </>
      }
    >
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-start gap-8">
          <div>
            <Money amount={payment.amount} currency={payment.currency} signed className="text-3xl font-semibold" />
            <div className="text-sm text-muted-foreground">{intervalLabel(payment.intervalDays)}</div>
          </div>
          <InfoList
            rows={[
              ["Next expected", formatDay(payment.nextExpected)],
              ["Last seen", formatDay(payment.lastSeen)],
              ["Seen", `${payment.occurrences} times`],
              ["Status", payment.status.toLowerCase()],
              ["Account", <BankAccount.DetailLink object={payment.account}>{payment.account.name || formatIban(payment.account.iban)}</BankAccount.DetailLink>],
            ]}
          />
        </div>
        <ListRender array={payment.transactions} title={<h2 className="text-lg font-semibold">Occurrences</h2>}>
          {(tx) => <TransactionCard key={tx.id} item={tx} />}
        </ListRender>
      </div>
    </BankRecurring.ModelPage>
  );
});

export default RecurringPaymentPage;
