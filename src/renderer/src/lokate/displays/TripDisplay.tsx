import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Route } from "lucide-react";
import { useGetTripQuery } from "../api/graphql";
import { MODE_ICONS } from "../components/ModeIcon";
import { MODE_LABELS, formatAt, formatDistance, formatDuration } from "../format";

/** `@lokate/trip` elsewhere: how, how far, when and how long. */
export const TripDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetTripQuery({ variables: { id: props.id } });
  const trip = data?.trip;
  if (!trip) return <DisplayLinePlaceholder {...props} icon={Route} />;

  return (
    <DisplayLine
      {...props}
      icon={MODE_ICONS[trip.mode]}
      title={`${MODE_LABELS[trip.mode]} · ${formatDistance(trip.distance)}`}
      meta={[formatAt(trip.start), formatDuration(trip.duration)]}
    />
  );
};
