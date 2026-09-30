import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { MapPin } from "lucide-react";
import { useGetVisitQuery } from "../api/graphql";
import { formatAt, formatDuration } from "../format";

/** `@lokate/visit` elsewhere: where (its place), when, and how long. */
export const VisitDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetVisitQuery({ variables: { id: props.id } });
  const visit = data?.visit;
  if (!visit) return <DisplayLinePlaceholder {...props} icon={MapPin} />;

  return (
    <DisplayLine
      {...props}
      icon={MapPin}
      title={visit.place?.name ?? `${visit.lat.toFixed(4)}, ${visit.lon.toFixed(4)}`}
      meta={[formatAt(visit.start), formatDuration(visit.duration)]}
    />
  );
};
