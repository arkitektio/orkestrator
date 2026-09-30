import { DisplayLine, DisplayLinePlaceholder, countOf } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { Images } from "lucide-react";
import { useGetDatasetQuery } from "../api/graphql";

/** `@omeroark/dataset` elsewhere: name and image count. */
export const DatasetDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetDatasetQuery({ variables: { id: props.id } });
  const dataset = data?.dataset;
  if (!dataset) return <DisplayLinePlaceholder {...props} icon={Images} />;

  return (
    <DisplayLine
      {...props}
      icon={Images}
      title={dataset.name}
      meta={[countOf(dataset.images.length, "image"), dataset.description]}
    />
  );
};
