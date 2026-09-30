import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { FolderKanban } from "lucide-react";
import { useGetProjectQuery } from "../api/graphql";

/** `@omeroark/project` elsewhere: name and dataset count. */
export const ProjectDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetProjectQuery({ variables: { id: props.id } });
  const project = data?.project;
  if (!project) return <DisplayLinePlaceholder {...props} icon={FolderKanban} />;

  return (
    <DisplayLine
      {...props}
      icon={FolderKanban}
      title={project.name}
      meta={[countOf(project.datasets.length, "dataset"), project.description]}
    />
  );
};
