import { Card } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { BankMerchant, BankPlace } from "@/bank/linkers";
import { MapPin } from "lucide-react";
import React from "react";
import { LocationSource, MerchantLocationFragment } from "../../api/graphql";
import { formatShortDay } from "../../format";

export const SOURCE_LABEL: Record<LocationSource, string> = {
  [LocationSource.Discovered]: "from bank lines",
  [LocationSource.Geocoded]: "looked up on OpenStreetMap",
  [LocationSource.Manual]: "set by hand",
};

export const placeAddress = (place: Pick<MerchantLocationFragment, "street" | "postalCode" | "city">) =>
  [place.street, [place.postalCode, place.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

export const isLocated = (place: Pick<MerchantLocationFragment, "latitude" | "longitude">) =>
  place.latitude != null && place.longitude != null;

/** A merchant's place: where, whose, how often. A dimmed pin: not on the map yet. */
const PlaceCard = ({ item }: { item: MerchantLocationFragment }) => (
  <BankPlace.Smart object={item}>
    <Card className="group p-3 flex items-center gap-3">
      <MapPin className={cn("h-4 w-4 shrink-0", isLocated(item) ? "text-foreground" : "text-muted-foreground/40")} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <BankPlace.DetailLink object={item} className="truncate font-medium">
            {item.name}
          </BankPlace.DetailLink>
          <span className="shrink-0 text-xs text-muted-foreground">
            {item.transactionCount}×{item.lastVisit && <> · {formatShortDay(item.lastVisit)}</>}
          </span>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          <BankMerchant.DetailLink object={item.merchant} className="hover:underline">
            {item.merchant.name}
          </BankMerchant.DetailLink>
          {placeAddress(item) && <> · {placeAddress(item)}</>}
        </div>
      </div>
    </Card>
  </BankPlace.Smart>
);

export default React.memo(PlaceCard);
