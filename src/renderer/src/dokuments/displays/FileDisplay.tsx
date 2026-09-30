import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FileIcon } from "lucide-react";
import { useGetFileQuery } from "../api/graphql";

/** `@dokuments/file` elsewhere: its name and the documents read from it. */
export const FileDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetFileQuery({ variables: { id: props.id } });
  const file = data?.file;
  if (!file) return <DisplayLinePlaceholder {...props} icon={FileIcon} />;

  return (
    <DisplayLine
      {...props}
      icon={FileIcon}
      title={file.name}
      meta={[countOf(file.documents.length, "document"), file.documents[0]?.title]}
    />
  );
};
