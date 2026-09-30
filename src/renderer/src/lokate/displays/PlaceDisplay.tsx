import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { MapPin } from "lucide-react";
import { useGetPlaceQuery } from "../api/graphql";
import { formatDay } from "../format";

/** `@lokate/place` elsewhere: its name, how often you were there, and when last. */
export const PlaceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetPlaceQuery({ variables: { id: props.id } });
  const place = data?.place;
  if (!place) return <DisplayLinePlaceholder {...props} icon={MapPin} />;

  return (
    <DisplayLine
      {...props}
      icon={MapPin}
      title={place.name ?? "Unnamed place"}
      meta={[countOf(place.visitCount, "visit"), place.lastVisitAt && `last ${formatDay(place.lastVisitAt)}`]}
    />
  );
};
