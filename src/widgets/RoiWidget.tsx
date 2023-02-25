import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import { PositionCanvas } from "../components/PositionCanvas";
import { RoiCanvas } from "../components/RoiCanvas";
import { TwoDOffcanvas } from "../experimental/render/TwoDOffcanvas";
import {
  useDetailPositionQuery,
  useDetailRepresentationQuery,
  useDetailRoiQuery,
  useDetailTableQuery,
} from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";

export const RoiWidget: React.FC<{ value: string }> = ({ value }) => {
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
