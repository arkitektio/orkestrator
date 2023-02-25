import React, { useEffect, useState } from "react";
import { ImageReturnWidgetFragment } from "../../../api/graphql";
import { ReturnWidgetProps } from "../../types";
import { useWidgetRegistry } from "../../widget-context";

const ImageReturnWidget: React.FC<
  ReturnWidgetProps<ImageReturnWidgetFragment>
> = ({ port, widget, value }) => {
  const [imageUrl, setImageUrl] = useState<string | undefined | null>();

  const { registry } = useWidgetRegistry();

  useEffect(() => {
    if (port.identifier) {
      const ward = registry?.ward_registry?.getWard(port.identifier);
      if (ward?.resolveImage) {
        let query = widget?.query;
        ward
          .resolveImage({
            query: query as string,
            variables: { id: value },
          })
          .then((result) => {
            console.warn(result);
            setImageUrl(result);
          })
          .catch(console.error);
      }
    }
  }, [value]);

  if (!port.identifier) return <>This port is not usable with this widget</>;

  if (!widget?.query)
    return (
      <div>
        {" "}
        There is no widget query specified for this port. Please specify a
        Widget and a query for this port.
        {JSON.stringify(widget)}
      </div>
    );

  return <div>{imageUrl && <img src={imageUrl} width={"100%"} />}</div>;
};

export { ImageReturnWidget };
