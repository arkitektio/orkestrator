import { Sample, Table } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListSampleFragment, ListTableFragment } from "../../api/graphql";

export const TableCard: React.FC<{
  table: ListTableFragment;
  mates: MateFinder[];
}> = ({ table, mates }) => {
  return (
    <Table.Smart
      object={table?.id}
      className={`rounded shadow-xl group text-white bg-gray-800`}
      mates={mates}
    >
      <div className="px-2 py-2 group text-white bg-center bg-cover truncate">
        <div className="flex"></div>
        <Table.DetailLink
          className="font-bold text-xl mb-2 cursor-pointer truncate"
          object={table?.id}
        >
          {table?.name}
        </Table.DetailLink>
        <p className="text-white-700 text-base">{table?.id}</p>
      </div>
    </Table.Smart>
  );
};
