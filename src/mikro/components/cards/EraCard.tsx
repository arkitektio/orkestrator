import Timestamp from "react-timestamp";
import { MikroEra } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListEraFragment } from "../../api/graphql";

interface StageCardProps {
  era: ListEraFragment;
  mates: MateFinder[];
}

export const EraCard = ({ era, mates }: StageCardProps) => {
  return (
    <MikroEra.Smart
      object={era.id}
      className="bg-back-800 p-4 text-white rounded shadow-lg"
      mates={mates}
    >
      <MikroEra.DetailLink object={era.id}>{era.name}</MikroEra.DetailLink>
      {era.start && (
        <span className="text-xs text-gray-400">
          {" "}
          <Timestamp date={era.start} />{" "}
        </span>
      )}
    </MikroEra.Smart>
  );
};
