import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { LayoutTemplate } from "lucide-react";
import { useGetBlokQuery } from "../api/graphql";

/** `@rekuest/blok` elsewhere: its name, catalog and how often it is materialized. */
export const BlokDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetBlokQuery({ variables: { id: props.id } });
  const blok = data?.blok;
  if (!blok) return <DisplayLinePlaceholder {...props} icon={LayoutTemplate} />;

  return (
    <DisplayLine
      {...props}
      icon={LayoutTemplate}
      title={blok.name}
      meta={[blok.catalog?.name, countOf(blok.materializedBloks.length, "instance")]}
    />
  );
};
