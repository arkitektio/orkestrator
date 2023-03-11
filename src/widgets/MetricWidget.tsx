import { PositionCanvas } from "../components/PositionCanvas";
import { SaveParentSize } from "../layout/SaveParentSize";
import {
  useDetailMetricQuery,
  useDetailPositionQuery,
} from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const MetricWidget: React.FC<StructureDisplayProps> = ({ value }) => {
  const { data } = withMikro(useDetailMetricQuery)({
    variables: { id: value },
  });

  console.log(data);

  return (
    <div className="w-full h-full items-center p-2">
      <div className="flex flex-col items-center">
        <div className="text-center">{data?.metric?.name}</div>
        <div className="text-center">{data?.metric?.value}</div>
      </div>
    </div>
  );
};