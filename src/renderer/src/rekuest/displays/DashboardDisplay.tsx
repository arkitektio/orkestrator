import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { PanelsTopLeft } from "lucide-react";
import { useGetDashboardQuery } from "../api/graphql";

/** `@rekuest/dashboard` elsewhere: its name and how many bloks it places. */
export const DashboardDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetDashboardQuery({ variables: { id: props.id } });
  const dashboard = data?.dashboard;
  if (!dashboard) return <DisplayLinePlaceholder {...props} icon={PanelsTopLeft} />;

  return (
    <DisplayLine
      {...props}
      icon={PanelsTopLeft}
      title={dashboard.name}
      meta={[countOf(dashboard.placements.length, "blok")]}
    />
  );
};
