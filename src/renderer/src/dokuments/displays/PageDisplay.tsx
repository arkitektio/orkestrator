import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { StickyNote } from "lucide-react";
import { useGetPageQuery } from "../api/graphql";

/** `@dokuments/page` elsewhere: its number and the start of its text. */
export const PageDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetPageQuery({ variables: { id: props.id } });
  const page = data?.page;
  if (!page) return <DisplayLinePlaceholder {...props} icon={StickyNote} />;

  return (
    <DisplayLine
      {...props}
      icon={StickyNote}
      title={`Page ${page.index + 1}`}
      meta={[page.content.trim().slice(0, 120)]}
    />
  );
};
