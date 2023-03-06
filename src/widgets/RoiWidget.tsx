import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import { RoiCanvas } from "../components/RoiCanvas";
import { useDetailRoiQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const RoiWidget: React.FC<StructureDisplayProps> = ({ value }) => {
  const { data } = withMikro(useDetailRoiQuery)({
    variables: { id: value },
  });

  return (
    <div className="p-3">
      {data && (
        <ParentSize debounceTime={500}>
          {({ width, height }) => (
            <>
              {data?.roi && (
                <RoiCanvas roi={data.roi} height={width} width={height} />
              )}
            </>
          )}
        </ParentSize>
      )}
    </div>
  );
};
