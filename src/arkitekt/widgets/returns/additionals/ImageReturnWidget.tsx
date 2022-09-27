import React, { useEffect, useState } from "react";
import { ImageReturnWidgetFragment } from "../../../api/graphql";
import { ReturnWidgetProps } from "../../types";

const ImageReturnWidget: React.FC<
  ReturnWidgetProps<ImageReturnWidgetFragment>
> = ({ port, widget, value, ward_registry }) => {
  const [imageUrl, setImageUrl] = useState<string | undefined | null>();

  useEffect(() => {
    if (port.identifier) {
      const ward = ward_registry.getWard(port.identifier);
      if (ward.resolveImage) {
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

  return (
    <div>
      {imageUrl && <img src={imageUrl} alt={port.key} width={"100%"} />}
      {port.description && (
        <div
          id={`${port.key}-help`}
          className="text-xs text-gray-600 mt-2 font-light"
        >
          {port.description}
        </div>
      )}
    </div>
  );
};

export { ImageReturnWidget };
