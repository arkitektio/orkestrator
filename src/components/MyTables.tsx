import React, { useEffect } from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroTable } from "../linker";
import { useDeleteTableMate } from "../mates/table/useDeleteTableMate";
import { withMikro } from "../mikro/MikroContext";
import {
  MyTablesEventDocument,
  MyTablesEventSubscriptionResult,
  MyTablesQuery,
  useMyTablesQuery,
} from "../mikro/api/graphql";
import { TableCard } from "../mikro/components/cards/TableCard";
import { DataHomeFilterParams } from "../mikro/pages/Home";
import { useConfirm } from "../providers/confirmer/confirmer-context";
export type IMyRepresentationsProps = {};

const MyTables: React.FC<IMyRepresentationsProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const { data, loading, refetch, subscribeToMore } = withMikro(
    useMyTablesQuery
  )({
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
    <ListRender
      array={data?.mytables}
      loading={loading}
      title={
        <MikroTable.ListLink className="flex-0">Stages</MikroTable.ListLink>
      }
      refetch={refetch}
    >
      {(table, index) => (
        <TableCard
          table={table}
          key={table.id}
          mates={[deleteTableMate(table)]}
        />
      )}
    </ListRender>
  );
};

export { MyTables };
