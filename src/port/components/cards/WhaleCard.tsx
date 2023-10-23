import Timestamp from "react-timestamp";
import { PortWhale } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListWhaleFragment } from "../../api/graphql";
import { useDatalayer } from "@jhnnsrs/datalayer";

interface UserCardProps {
  whale: ListWhaleFragment;
  mates: MateFinder[];
}

export const WhaleCard = ({ whale, mates }: UserCardProps) => {
  const { s3resolve } = useDatalayer();
  return (
    <PortWhale.Smart
      object={whale.id}
      className="bg-back-800 p-3 text-white rounded-md rounded border border-back-700 rounded rounded-md"
      mates={mates}
    >
      <div className="flex flex-row">
        {whale.deployment.manifest.logo ? (
          <>
            <img
              src={s3resolve(whale.deployment.manifest.logo)}
              className="w-8 h-8 mr-2 rounded-full rounded my-auto"
            />
          </>
        ) : (
          <>
            <div className="w-8 h-8 mr-2 rounded-full rounded bg-primary-300 my-auto" />
          </>
        )}
        <PortWhale.DetailLink
          object={whale.id}
          className="flex-grow flex-col truncate my-auto"
        >
          <div className="text-xl font-light mb-1 flex">
            {whale.deployment.manifest.identifier}:
            {whale.deployment.manifest.version}
          </div>
          <div className="text-sm font-extralight">
            <Timestamp date={whale?.createdAt} relative></Timestamp>
          </div>
        </PortWhale.DetailLink>
      </div>
    </PortWhale.Smart>
  );
};
