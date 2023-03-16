import Timestamp from "react-timestamp";
import { Container, Whale } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListWhaleFragment } from "../../api/graphql";

interface UserCardProps {
  whale: ListWhaleFragment;
  mates: MateFinder[];
}

export const WhaleCard = ({ whale, mates }: UserCardProps) => {
  return (
    <Whale.Smart
      object={whale.id}
      className="bg-back-800 p-3 text-white rounded-md rounded "
      mates={mates}
    >
      <div className="flex flex-row">
        <Whale.DetailLink
          object={whale.id}
          className="flex-grow flex-col truncate"
        >
          <div className="text-xl font-light mb-1 flex">{whale.image}</div>
          <div className="text-sm font-extralight">
            <Timestamp date={whale?.createdAt} relative></Timestamp>
          </div>
        </Whale.DetailLink>
      </div>
    </Whale.Smart>
  );
};
