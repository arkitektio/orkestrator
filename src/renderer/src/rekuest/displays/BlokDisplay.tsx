import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { LayoutTemplate } from "lucide-react";
import { useGetBlokQuery } from "../api/graphql";
import { OwnBlokLogo } from "../components/logo/OwnBlokLogo";

/** `@rekuest/blok` elsewhere: its name, catalog and how often it is materialized. */
export const BlokDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetBlokQuery({ variables: { id: props.id } });
  const blok = data?.blok;
  if (!blok) return <DisplayLinePlaceholder {...props} icon={LayoutTemplate} />;

  return (
    <DisplayLine
      {...props}
      icon={LayoutTemplate}
      // Its own <logo> when it declares one.
      leading={blok.hasLogo ? <OwnBlokLogo blok={blok} className="h-4 w-4" /> : undefined}
      title={blok.name}
      meta={[blok.module?.name, countOf(blok.materializedBloks.length, "instance")]}
    />
  );
};
