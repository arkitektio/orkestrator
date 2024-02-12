import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { useGetImageQuery } from "../omero-ark/api/graphql";
import AuthorizedImage from "../omero-ark/components/Thumbnail";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const OmeroImageWidget: React.FC<StructureDisplayProps> = ({
  value,
  minimal = false,
  label = false,
}) => {
  const { data } = withOmeroArk(useGetImageQuery)({
    variables: { id: value },
  });

  return (
    <div className="flex-grow">
      {data?.image && !minimal && (
        <AuthorizedImage
          id={data?.image.id}
          size={400}
        />
      )}
      {(minimal || label) && (
        <div className="text-center mt-1">{data?.image?.name}</div>
      )}
    </div>
  );
};
