import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import { PositionCanvas } from "../components/PositionCanvas";
import { TwoDOffcanvas } from "../experimental/render/TwoDOffcanvas";
import { SaveParentSize } from "../layout/SaveParentSize";
import {
  useDetailPositionQuery,
  useDetailRepresentationQuery,
} from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export const PositionWidget: React.FC<{ value: string }> = ({ value }) => {
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
