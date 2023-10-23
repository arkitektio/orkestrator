import { PortDeployment } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListDeploymentFragment } from "../../api/graphql";

interface UserCardProps {
  deployment: ListDeploymentFragment;
  mates: MateFinder[];
}

export const DeploymentCard = ({ deployment, mates }: UserCardProps) => {
  const isdeployed = deployment.whales && deployment.whales.length > 0;
  return (
    <PortDeployment.Smart
      object={deployment.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      mates={mates}
    >
      <div className="p-2 flex flex-row justify-between">
        <div className="flex flex-col">
          <PortDeployment.DetailLink
            object={deployment.id}
            className={`flex-grow ${
              isdeployed ? "font-bold" : "font-light"
            } text-xs text-2xl`}
          >
            {deployment.manifest.identifier}
          </PortDeployment.DetailLink>
          {deployment.manifest.version}
        </div>
        {isdeployed && (
          <div className="w-3 h-3 rounded rounded-full bg-primary-200 my-auto" />
        )}
      </div>
    </PortDeployment.Smart>
  );
};
