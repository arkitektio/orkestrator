import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { ActionButton } from "../layout/ActionButton";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Plot, Sample } from "../linker";
import {
  CreatePlotMutation,
  ListPlotFragment,
  MyPlotsDocument,
  MyPlotsQuery,
  useDeletePlotMutation,
  useMyPlotsQuery,
} from "../mikro/api/graphql";
import { CreatePlotModal } from "../mikro/components/dialogs/CreatePlotModal";
import { CreateSampleModal } from "../mikro/components/dialogs/CreateSampleModal";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMySamplesProps = {};

export const SampleType = "Sample";

const limit = 20;

export const PlotCard: React.FC<{
  plot: Maybe<ListPlotFragment>;
}> = ({ plot }) => {
  const { confirm } = useConfirm();

  const [deletePlot, res] = withMikro(useDeletePlotMutation)();

  if (!plot?.id) return <></>;

  return (
    <Plot.Smart
      object={plot?.id}
      dragClassName={({ isOver, canDrop }) =>
        `bg-slate-700 text-white rounded overflow-hidden shadow-md pl-3 pr-2 py-2 flex group ${
          isOver && "border-primary-200 border"
        }`
      }
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@mikro/plot") {
          return [
            {
              accepts: [accept],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await deletePlot({
                  variables: { id: plot.id },
                });
              },
              label: <BsTrash />,
              description: "Delete Sample",
            },
          ];
        }

        if (accept == "list:@mikro/plot") {
          return [
            {
              accepts: ["list:@mikro/sample"],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want all this plots delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                for (const drop of drops) {
                  await deletePlot({
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
      <Plot.DetailLink
        className="cursor-pointer font-semibold"
        object={plot.id}
      >
        {plot?.name}
      </Plot.DetailLink>
    </Plot.Smart>
  );
};

export const MyPlots: React.FC<IMySamplesProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const variables = { limit: limit, offset: 0, createdDay: createdDay };
  const { data, loading, refetch, subscribeToMore } = withMikro(
    useMyPlotsQuery
  )({
    variables,
  });

  const [show, setshow] = useState(false);

  const [offset, setOffset] = useState(0);

  const { ask } = useDialog();

  useEffect(() => {
    refetch();
  }, [offset, limit]);

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Sample.ListLink className="flex-0">Plots</Sample.ListLink>
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
          {data?.myplots && data?.myplots.length == limit && (
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
        {data?.myplots?.map((plot, index) => (
          <PlotCard key={index} plot={plot} />
        ))}
      </ResponsiveContainerGrid>
      <ActionButton
        label="Create new Plot"
        description="Create a new Plot"
        className="text-white "
        onAction={async () => {
          console.log("create plot");

          await ask(CreatePlotModal, {
            update(cache, result) {
              const existing = cache.readQuery<MyPlotsQuery>({
                query: MyPlotsDocument,
                variables,
              });
              if (result.data?.createPlot == null) return;
              cache.writeQuery({
                query: MyPlotsDocument,
                variables,
                data: {
                  myplots: existing?.myplots?.concat(result.data?.createPlot),
                },
              });
            },
          });
        }}
      >
        <BsPlusCircle />
      </ActionButton>
    </div>
  );
};
