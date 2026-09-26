import { DisplayWidgetProps } from "@/core/smart/display/registry";
import { BankPlace } from "@/bank/linkers";
import { MapPin } from "lucide-react";
import { useGetMerchantLocationQuery } from "../api/graphql";
import PlaceCard from "../components/cards/PlaceCard";

/** `@bank/place` wherever another module shows one. */
export const PlaceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetMerchantLocationQuery({ variables: { id: props.id } });
  const place = data?.merchantLocation;
  if (!place) return <span className="text-xs text-muted-foreground">Place</span>;
  if (props.variant === "inline" || props.variant === "avatar" || props.variant === "chip") {
    return (
      <BankPlace.DetailLink object={place} className="inline-flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate">{place.name}</span>
      </BankPlace.DetailLink>
    );
  }
  return <PlaceCard item={place} />;
};
