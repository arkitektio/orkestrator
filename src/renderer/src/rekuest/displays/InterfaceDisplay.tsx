import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Plug } from "lucide-react";
import { useGetInterfaceQuery } from "../api/graphql";

/** `@rekuest/interface` elsewhere (keyed by its identifier): package and usage. */
export const InterfaceDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetInterfaceQuery({ variables: { id: props.id } });
  const iface = data?.interface;
  if (!iface) return <DisplayLinePlaceholder {...props} icon={Plug} />;

  return (
    <DisplayLine
      {...props}
      icon={Plug}
      title={iface.key}
      meta={[
        iface.package.key,
        countOf(iface.inputUsages.length, "input"),
        countOf(iface.outputUsages.length, "output"),
      ]}
    />
  );
};
