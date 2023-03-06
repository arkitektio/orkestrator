import { PositionCanvas } from "../components/PositionCanvas";
import { SaveParentSize } from "../layout/SaveParentSize";
import { useDetailStageQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
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
