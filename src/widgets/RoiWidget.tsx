import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import { withMikro } from "../mikro/MikroContext";
import { useDetailRoiQuery } from "../mikro/api/graphql";
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
              <div className="text-white">
                {data.roi?.label || ""}
                {data?.roi?.type}
              </div>
            </>
          )}
        </ParentSize>
      )}
    </div>
  );
};
