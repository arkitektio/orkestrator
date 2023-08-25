import { SaveParentSize } from "../layout/SaveParentSize";
import { withMikro } from "../mikro/MikroContext";
import { useDetailStageQuery } from "../mikro/api/graphql";
import { PositionCanvas } from "../mikro/components/canvases/PositionCanvas";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const StageWidget: React.FC<StructureDisplayProps> = ({ value }) => {
  const { data } = withMikro(useDetailStageQuery)({
    variables: { id: value },
  });

  return (
    <div className="w-full h-full p-3">
      {data && (
        <SaveParentSize>
          {({ width, height }) => (
            <>
              {data?.stage?.positions && (
                <PositionCanvas
                  positions={data?.stage?.positions}
                  height={width > height ? height : width}
                  width={width > height ? height : width}
                />
              )}
            </>
          )}
        </SaveParentSize>
      )}
    </div>
  );
};
