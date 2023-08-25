import { SaveParentSize } from "../layout/SaveParentSize";
import { withMikro } from "../mikro/MikroContext";
import { useDetailPositionQuery } from "../mikro/api/graphql";
import { PositionCanvas } from "../mikro/components/canvases/PositionCanvas";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const PositionWidget: React.FC<StructureDisplayProps> = ({ value }) => {
  const { data } = withMikro(useDetailPositionQuery)({
    variables: { id: value },
  });

  console.log(data);

  return (
    <div className="w-full h-full items-center p-2">
      <SaveParentSize>
        {({ width, height }) => (
          <>
            {data?.position?.stage?.positions && (
              <PositionCanvas
                positions={data?.position?.stage?.positions}
                highlight={[data?.position.id]}
                height={width > height ? height : width}
                width={width > height ? height : width}
              />
            )}
          </>
        )}
      </SaveParentSize>
    </div>
  );
};
