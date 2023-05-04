import Timestamp from "react-timestamp";
import { Era } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListEraFragment } from "../../api/graphql";

interface StageCardProps {
  era: ListEraFragment;
  mates: MateFinder[];
}

export const EraCard = ({ era, mates }: StageCardProps) => {
  return (
    <Era.Smart
      object={era.id}
      className="bg-back-800 p-4 text-white rounded shadow-lg"
      mates={mates}
    >
      <Era.DetailLink object={era.id}>{era.name}</Era.DetailLink>
      {era.start && (
        <span className="text-xs text-gray-400">
          {" "}
          <Timestamp date={era.start} />{" "}
        </span>
      )}
    </Era.Smart>
  );
};
