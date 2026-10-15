import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Play } from "lucide-react";
import { useHoverActionQuery } from "../api/graphql";
import { BlokLogo } from "../components/logo/BlokLogo";

/** `@rekuest/action` elsewhere: its name, and how many agents can run it right now. */
export const ActionDisplay = (props: DisplayWidgetProps) => {
  const { data } = useHoverActionQuery({ variables: { id: props.id } });
  const action = data?.action;
  if (!action) return <DisplayLinePlaceholder {...props} icon={Play} />;

  const runnable = action.implementations.filter((implementation) => implementation.agent.connected).length;
  return (
    <DisplayLine
      {...props}
      icon={Play}
      // Its logo, when an implementation brings one, in the icon's place.
      leading={action.logo ? <BlokLogo blok={action.logo} className="h-4 w-4" /> : undefined}
      title={action.name}
      meta={[
        action.kind.toLowerCase(),
        action.stateful && "stateful",
        runnable > 0 ? `${countOf(runnable, "agent")} online` : "no agent online",
      ]}
    />
  );
};
