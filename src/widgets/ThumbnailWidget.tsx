import { useDatalayer } from "@jhnnsrs/datalayer";
import { OptimizedImage } from "../layout/OptimizedImage";
import { withMikro } from "../mikro/MikroContext";
import { useDetailThumbnailQuery } from "../mikro/api/graphql";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";
import { ExperimentalFeature } from "../settings/Experimental";

export const ThumbnailWidget: React.FC<StructureDisplayProps> = ({
  value,
  minimal = false,
  label = false,
}) => {
  const { data } = withMikro(useDetailThumbnailQuery)({
    variables: { id: value },
  });

  const { s3resolve } = useDatalayer();
  return (
    <ExperimentalFeature>
      <div className="flex-grow">
        {data?.thumbnail?.image && (
          <OptimizedImage
            src={s3resolve(data?.thumbnail?.image)}
            style={{ filter: "brightness(0.7)" }}
            className="w-full absolute top-0 left-0 rounded"
            blurhash={data?.thumbnail?.blurhash}
          />
        )}
        {(minimal || label) && (
          <div className="text-center mt-1">
            {data?.thumbnail?.representation?.name}
          </div>
        )}
      </div>
    </ExperimentalFeature>
  );
};
