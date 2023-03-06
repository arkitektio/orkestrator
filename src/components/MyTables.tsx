import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { SectionTitle } from "../layout/SectionTitle";
import { Table } from "../linker";
import {
  MyTablesEventDocument,
  MyTablesEventSubscriptionResult,
  MyTablesQuery,
  useDeleteTableMutation,
  useMyTablesQuery,
} from "../mikro/api/graphql";
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

  const [deleteTable] = withMikro(useDeleteTableMutation)();

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
        {data?.mytables?.map(
          (table, index) =>
            table?.id && (
              <Table.Smart
                key={index}
                object={table?.id}
                className={`rounded shadow-xl group text-white bg-gray-800`}
                additionalMates={(accept, self) => {
                  if (!self) return [];

                  if (accept == "item:@mikro/table") {
                    return [
                      {
                        accepts: [accept],
                        action: async (self, drops) => {
                          await confirm({
                            message: "Do you really want to delete?",
                            subtitle: "Deletion is irreversible!",
                            confirmLabel: "Yes delete!",
                          });

                          await deleteTable({
                            variables: { id: table.id },
                          });
                        },
                        label: <BsTrash />,
                        description: "Delete Sample",
                      },
                    ];
                  }

                  if (accept == "list:@mikro/table") {
                    return [
                      {
                        accepts: [accept],
                        action: async (self, drops) => {
                          await confirm({
                            message:
                              "Do you really want all this samples delete?",
                            subtitle: "Deletion is irreversible!",
                            confirmLabel: "Yes delete!",
                          });

                          for (const drop of drops) {
                            await deleteTable({
                              variables: { id: drop.object },
                            });
                          }
                        },
                        label: (
                          <div className="flex flex-row">
                            <BsTrash className="my-auto" />{" "}
                            <span className="my-auto">Delete all</span>
                          </div>
                        ),
                        description: "Delete All Samples",
                      },
                    ];
                  }

                  return [];
                }}
              >
                <div
                  key={index}
                  className="px-2 py-2 group text-white bg-center bg-cover truncate"
                >
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
            )
        )}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyTables };
