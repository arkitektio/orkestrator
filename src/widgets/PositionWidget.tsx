import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import { PositionCanvas } from "../components/PositionCanvas";
import { TwoDOffcanvas } from "../experimental/render/TwoDOffcanvas";
import {
  useDetailPositionQuery,
  useDetailRepresentationQuery,
} from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export const PositionWidget: React.FC<{ value: string }> = ({ value }) => {
  const { data } = withMikro(useDetailPositionQuery)({
    variables: { id: value },
  });

  return (
    <div className="p-3">
      {data && (
        <ParentSize>
          {({ width, height }) => (
            <>
              {data?.position?.stage?.positions && (
                <PositionCanvas
                  positions={data?.position?.stage?.positions}
                  highlight={[data?.position.id]}
                  height={width}
                  width={height}
                />
              )}
            </>
          )}
        </ParentSize>
      )}
    </div>
  );
};
