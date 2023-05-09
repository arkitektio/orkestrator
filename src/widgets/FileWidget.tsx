import { useDetailOmeroFileQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

export const FileWidget: React.FC<StructureDisplayProps> = ({ value }) => {
  const { data } = withMikro(useDetailOmeroFileQuery)({
    variables: { id: value },
  });

  console.log(data);

  return (
    <div className="w-full h-full items-center p-2">
      <div className="flex flex-col items-center">
        <div className="text-center">{data?.omerofile?.name}</div>
      </div>
    </div>
  );
};
