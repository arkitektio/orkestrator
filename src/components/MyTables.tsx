import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Table } from "../linker";
import { useDeleteTableMate } from "../mates/table/useDeleteTableMate";
import {
  MyTablesEventDocument,
  MyTablesEventSubscriptionResult,
  MyTablesQuery,
  useDeleteTableMutation,
  useMyTablesQuery,
} from "../mikro/api/graphql";
import { TableCard } from "../mikro/components/cards/TableCard";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMyRepresentationsProps = {};

const MyTables: React.FC<IMyRepresentationsProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const [offset, setOffset] = useState(0);

  const {
    data,
    loading: all_loading,
    refetch,
    subscribeToMore,
  } = withMikro(useMyTablesQuery)({
    variables: { limit: limit, offset: 0, createdDay: createdDay },
  });

  const deleteTableMate = useDeleteTableMate();

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore({
      document: MyTablesEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        var data = subscriptionData as MyTablesEventSubscriptionResult;
        let action = data.data?.myTables;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          newelements = prev.mytables?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.mytables
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          newelements = prev.mytables?.concat(updated_res);
        }

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          mytables: newelements,
        } as MyTablesQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  const { confirm } = useConfirm();

  return (
    <div>
      <div className="font-light text-xl flex mr-2">
        <Table.ListLink>
          <SectionTitle>Tables</SectionTitle>
        </Table.ListLink>
        <div className="flex-grow"></div>
        <div className="flex-0">
          {offset != 0 && (
            <button
              type="button"
              className="p-1 text-gray-600 rounded"
              onClick={() => setOffset(offset - limit)}
            >
              {" "}
              <BsCaretLeft />{" "}
            </button>
          )}
          {data?.mytables && data?.mytables.length == limit && (
            <button
              type="button"
              className="p-1 text-gray-600 rounded"
              onClick={() => setOffset(offset + limit)}
            >
              {" "}
              <BsCaretRight />{" "}
            </button>
          )}
        </div>
      </div>
      <ResponsiveContainerGrid>
        {data?.mytables?.filter(notEmpty).map((table) => (
          <TableCard
            table={table}
            key={table.id}
            mates={[deleteTableMate(table)]}
          />
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyTables };
