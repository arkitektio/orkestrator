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
import { Plot, Sample } from "../linker";
import {
  ListPlotFragment,
  MyPlotsQuery,
  useDeletePlotMutation,
  useMyPlotsQuery,
} from "../mikro/api/graphql";
import { CreatePlotModal } from "../mikro/components/dialogs/CreatePlotModal";
import { CreateSampleModal } from "../mikro/components/dialogs/CreateSampleModal";
import { withMikro } from "../mikro/mikro-types";
import { useConfirm } from "./confirmer/confirmer-context";
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

export const MyPlots: React.FC<IMySamplesProps> = () => {
  const { data, loading, refetch, subscribeToMore } = withMikro(
    useMyPlotsQuery
  )({
    //pollInterval: 1000,
  });

  const [show, setshow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch();
  }, [offset, limit]);

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Sample.ListLink className="flex-0">My Plots</Sample.ListLink>
        <div className="flex-grow"></div>
        <div className="flex-0">
          {offset != 0 && (
            <button
              className="p-1 text-gray-600 rounded"
              onClick={() => setOffset(offset - limit)}
            >
              {" "}
              <BsCaretLeft />{" "}
            </button>
          )}
          {data?.myplots && data?.myplots.length == limit && (
            <button
              className="p-1 text-gray-600 rounded"
              onClick={() => setOffset(offset + limit)}
            >
              {" "}
              <BsCaretRight />{" "}
            </button>
          )}
        </div>
      </div>
      <ResponsiveGrid>
        {data?.myplots?.map((plot, index) => (
          <PlotCard key={index} plot={plot} />
        ))}
        <div className="flex flex-row">
          <ActionButton
            label="Create new Plot"
            description="Create a new plot"
            className="text-white "
            onAction={async () => setshow(true)}
          >
            <BsPlusCircle />
          </ActionButton>
          <CreatePlotModal show={show} setShow={setshow} />
        </div>
      </ResponsiveGrid>
    </div>
  );
};
