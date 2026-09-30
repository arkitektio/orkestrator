import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { ImageIcon } from "lucide-react";
import { useGetOmeroImageQuery } from "../api/graphql";

/** `@omeroark/image` elsewhere: name, acquisition date and tags. */
export const ImageDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetOmeroImageQuery({ variables: { id: props.id } });
  const image = data?.image;
  if (!image) return <DisplayLinePlaceholder {...props} icon={ImageIcon} />;

  return (
    <DisplayLine
      {...props}
      icon={ImageIcon}
      title={image.name}
      meta={[
        image.acquisitionDate && new Date(image.acquisitionDate).toLocaleDateString(),
        image.tags.slice(0, 3).join(", "),
      ]}
    />
  );
};
