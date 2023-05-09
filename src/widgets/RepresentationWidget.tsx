import { TwoDOffcanvas } from "../experimental/render/TwoDOffcanvas";
import { useDetailRepresentationQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const RepresentationWidget: React.FC<StructureDisplayProps> = ({
  value,
  minimal = false,
  label = false,
}) => {
  const { data } = withMikro(useDetailRepresentationQuery)({
    variables: { id: value },
  });

  return (
    <div className="flex-grow">
      {data?.representation && !minimal && (
        <TwoDOffcanvas
          representation={data?.representation}
          withRois={true}
          follow={"width"}
        />
      )}
      {(minimal || label) && (
        <div className="text-center mt-1">{data?.representation?.name}</div>
      )}
    </div>
  );
};
