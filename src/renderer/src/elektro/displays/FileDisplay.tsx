import { DisplayLine, DisplayLinePlaceholder, formatBytes } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FileIcon } from "lucide-react";
import { useGetFileQuery } from "../api/graphql";

/** `@elektro/file` elsewhere: name, size, type and folder. */
export const FileDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetFileQuery({ variables: { id: props.id } });
  const file = data?.file;
  if (!file) return <DisplayLinePlaceholder {...props} icon={FileIcon} />;

  return (
    <DisplayLine
      {...props}
      icon={FileIcon}
      title={file.name}
      meta={[formatBytes(file.size), file.contentType?.split("/").pop(), file.folder?.name]}
    />
  );
};
