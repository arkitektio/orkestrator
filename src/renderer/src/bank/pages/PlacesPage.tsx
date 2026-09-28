import { PageAction } from "@/core/ui/page-action";
import { BankPlace } from "@/bank/linkers";
import { MapPinOff } from "lucide-react";
import { useMemo, useState } from "react";
import PlaceList from "../components/lists/PlaceList";
import { MerchantSectionNav } from "../components/merchants/MerchantSectionNav";

/** Every merchant's places; "Not on map" narrows to the ones still missing coordinates. */
const PlacesPage = () => {
  const [unlocated, setUnlocated] = useState(false);
  const filters = useMemo(() => (unlocated ? { unlocated: true } : undefined), [unlocated]);

  return (
    <BankPlace.ListPage
      title="Places"
      pageActions={
        <PageAction
          size="sm"
          collapse="icon"
          variant={unlocated ? "secondary" : "outline"}
          icon={<MapPinOff className="h-4 w-4" />}
          onClick={() => setUnlocated((v) => !v)}
        >
          Not on map
        </PageAction>
      }
    >
      <MerchantSectionNav className="mb-3" />
      <PlaceList
        title=""
        filters={filters}
        defaultLimit={60}
        emptyDescription={
          unlocated
            ? "Every place is on the map."
            : "Places come from store numbers on bank lines, or add one from a merchant."
        }
      />
    </BankPlace.ListPage>
  );
};

export default PlacesPage;
