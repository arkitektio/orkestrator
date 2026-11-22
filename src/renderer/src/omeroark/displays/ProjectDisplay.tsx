import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FolderKanban } from "lucide-react";
import { useGetProjectLineQuery } from "../api/graphql";

/** `@omeroark/project` elsewhere: name and dataset count. */
export const ProjectDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetProjectLineQuery({ variables: { id: props.id } });
  const project = data?.project;
  if (!project) return <DisplayLinePlaceholder {...props} icon={FolderKanban} />;

  return (
    <DisplayLine
      {...props}
      icon={FolderKanban}
      title={project.name}
      meta={[countOf(project.datasetCount, "dataset"), project.description]}
    />
  );
};
