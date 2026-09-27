import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageAction } from "@/core/ui/page-action";
import { BankMerchant, BankPlace } from "@/bank/linkers";
import { MapPin, Pencil, Search } from "lucide-react";
import { useMemo } from "react";
import { toast } from "@/core/notify";
import { useGeocodeMerchantLocationMutation, useGetMerchantLocationQuery } from "../api/graphql";
import { isLocated, placeAddress, SOURCE_LABEL } from "../components/cards/PlaceCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { useTransactionFilterBar } from "../components/filter/TransactionFilterBar";
import { InfoList } from "../components/InfoList";
import { LocationInsightsTab } from "../components/insights/tabs/LocationInsightsTab";
import ReviewTransactionList from "../components/lists/ReviewTransactionList";
import { LocationsMap } from "../components/map/LocationsMap";
import { MerchantLogo } from "../components/MerchantLogo";
import { toastText } from "../errors";
import { formatDay } from "../format";

const PlacePage = asDetailQueryRoute(useGetMerchantLocationQuery, ({ data }) => {
  const place = data.merchantLocation;
  const { openDialog } = useDialog();
  const [geocode, { loading: locating }] = useGeocodeMerchantLocationMutation();
  const base = useMemo(() => ({ locations: [place.id] }), [place.id]);
  const { filters, ordering, actions } = useTransactionFilterBar(base);
  const locate = () =>
    geocode({ variables: { id: place.id } })
      .then((r) =>
        r.data?.geocodeMerchantLocation.latitude != null
          ? toast.success("Found it")
          : toast.info("No match; add or fix the address and try again"),
      )
      .catch((e) => toast.error("Could not look it up: " + toastText(e)));

  return (
    <BankPlace.ModelPage
      title={
        <span className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {place.name}
        </span>
      }
      object={place}
      pageActions={
        <>
          {actions}
          <PageAction
            size="sm"
            collapse="icon"
            priority={-5}
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("bankplace", { id: place.id }, { size: "medium" })}
          >
            Edit
          </PageAction>
          <PageAction
            size="sm"
            collapse="icon"
            priority={-10}
            disabled={locating}
            icon={<Search className="h-4 w-4" />}
            onClick={locate}
          >
            {isLocated(place) ? "Look up again" : "Find on map"}
          </PageAction>
        </>
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                ["Merchant", <BankMerchant.DetailLink object={place.merchant}>{place.merchant.name}</BankMerchant.DetailLink>],
                ["Address", placeAddress(place)],
                ["Region", [place.region, place.country].filter(Boolean).join(", ")],
                ["Store no.", place.storeCode && <span className="font-mono text-xs">{place.storeCode}</span>],
                ["Position", isLocated(place) && SOURCE_LABEL[place.source]],
                ["Looked up", place.geocodedAt && formatDay(place.geocodedAt)],
                ["Last visit", place.lastVisit && formatDay(place.lastVisit)],
              ]}
            />
            {place.notes && <p className="whitespace-pre-wrap px-3 pb-3 text-sm">{place.notes}</p>}
          </Sidebars.Tab>
          <Sidebars.Tab label="Insights">
            <LocationInsightsTab location={place.id} />
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex flex-col gap-6">
        <BankMerchant.DetailLink object={place.merchant} className="flex w-fit items-center gap-3 rounded-md border p-2 pr-4 hover:bg-accent/50">
          <MerchantLogo merchant={place.merchant} />
          <span className="flex flex-col">
            <span className="font-medium">{place.merchant.name}</span>
            <span className="text-xs text-muted-foreground">
              {place.transactionCount} {place.transactionCount === 1 ? "visit" : "visits"} here
            </span>
          </span>
          {place.merchant.category && <CategoryBadge category={place.merchant.category} link={false} className="ml-2" />}
        </BankMerchant.DetailLink>
        {isLocated(place) ? (
          <LocationsMap locations={[place]} color={place.merchant.category?.color} className="h-72" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Not on the map yet. Add an address, or find it from its name.
          </p>
        )}
        <ReviewTransactionList filters={filters} ordering={ordering} defaultLimit={30} title="Transactions here" />
      </div>
    </BankPlace.ModelPage>
  );
});

export default PlacePage;
