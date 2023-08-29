import { PortDeployment } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListDeploymentFragment } from "../../api/graphql";

interface UserCardProps {
  deployment: ListDeploymentFragment;
  mates: MateFinder[];
}

export const DeploymentCard = ({ deployment, mates }: UserCardProps) => {
  return (
    <PortDeployment.Smart
      object={deployment.id}
      className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex">
          <PortDeployment.DetailLink
            object={deployment.id}
            className="flex-grow font-semibold text-xs"
          >
            {deployment.manifest.identifier}:{deployment.manifest.version}
          </PortDeployment.DetailLink>
          {deployment.whales && deployment.whales.length > 0 && <>Deployed</>}
        </div>
      </div>
    </PortDeployment.Smart>
  );
};
