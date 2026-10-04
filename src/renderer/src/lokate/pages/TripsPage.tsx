import { LokateTrip } from "@/lokate/linkers";
import { Ordering } from "../api/graphql";
import TripList from "../components/lists/TripList";

// Hoisted: the list resets its paging whenever this changes identity.
const NEWEST_FIRST = [{ start: Ordering.Desc }];

const Page = () => {
  return (
    <LokateTrip.ListPage title="Trips">
      <div className="p-3">
        <TripList ordering={NEWEST_FIRST} defaultLimit={40} />
      </div>
    </LokateTrip.ListPage>
  );
};

export default Page;
