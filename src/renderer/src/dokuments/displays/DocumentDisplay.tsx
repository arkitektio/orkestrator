import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FileText } from "lucide-react";
import { useGetDocumentQuery } from "../api/graphql";

/** `@dokuments/document` elsewhere: its title and page count. */
export const DocumentDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetDocumentQuery({ variables: { id: props.id } });
  const document = data?.document;
  if (!document) return <DisplayLinePlaceholder {...props} icon={FileText} />;

  return (
    <DisplayLine
      {...props}
      icon={FileText}
      title={document.title}
      meta={[countOf(document.pages.length, "page")]}
    />
  );
};
