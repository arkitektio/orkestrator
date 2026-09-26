import { PageAction } from "@/core/ui/page-action";
import { BankRecurring } from "@/bank/linkers";
import { toast } from "sonner";
import { ListRecurringPaymentsDocument, RecurringStatus, useDetectRecurringMutation } from "../api/graphql";
import RecurringList from "../components/lists/RecurringList";

const DETECTED = { status: RecurringStatus.Detected };
const CONFIRMED = { status: RecurringStatus.Confirmed };

const RecurringPage = () => {
  const [detect, { loading }] = useDetectRecurringMutation({ refetchQueries: [ListRecurringPaymentsDocument] });
  return (
    <BankRecurring.ListPage
      title="Recurring"
      pageActions={
        <PageAction
          size="sm"
          disabled={loading}
          onClick={() =>
            detect()
              .then((r) => toast.success(`${r.data?.detectRecurring.length ?? 0} recurring payments found`))
              .catch((e: Error) => toast.error(e.message))
          }
        >
          {loading ? "Detecting..." : "Detect"}
        </PageAction>
      }
    >
      <div className="p-3 flex flex-col gap-6">
        <RecurringList title="Confirmed" filters={CONFIRMED} defaultLimit={50} />
        <RecurringList title="To review" filters={DETECTED} defaultLimit={50} />
      </div>
    </BankRecurring.ListPage>
  );
};

export default RecurringPage;
