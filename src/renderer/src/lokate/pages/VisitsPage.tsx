import { LokateVisit } from "@/lokate/linkers";
import { Ordering } from "../api/graphql";
import VisitList from "../components/lists/VisitList";

// Hoisted: the list resets its paging whenever this changes identity.
const NEWEST_FIRST = [{ start: Ordering.Desc }];

const Page = () => {
  return (
    <LokateVisit.ListPage title="Visits">
      <div className="p-3">
        <VisitList ordering={NEWEST_FIRST} defaultLimit={40} />
      </div>
    </LokateVisit.ListPage>
  );
};

export default Page;
