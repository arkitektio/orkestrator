import Timestamp from "react-timestamp";
import { Container, Whale } from "../../../linker";
import { ListWhaleFragment } from "../../api/graphql";

interface UserCardProps {
  whale: ListWhaleFragment;
}

export const WhaleCard = ({ whale }: UserCardProps) => {
  return (
    <Whale.Smart
      object={whale.id}
      className="bg-back-800 p-3 text-white rounded-md rounded "
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
