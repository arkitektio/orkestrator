import { Maybe } from "graphql/jsutils/Maybe";
import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { ActionButton } from "../layout/ActionButton";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Plot, Sample } from "../linker";
import { useDeletePlotMate } from "../mates/plot/useDeletePlotMate";
import {
  CreatePlotMutation,
  ListPlotFragment,
  MyPlotsDocument,
  MyPlotsQuery,
  useDeletePlotMutation,
  useMyPlotsQuery,
} from "../mikro/api/graphql";
import { PlotCard } from "../mikro/components/cards/PlotCard";
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

  const deletePlotMate = useDeletePlotMate();
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
        {data?.myplots?.filter(notEmpty).map((plot, index) => (
          <PlotCard key={index} plot={plot} mates={[deletePlotMate(plot)]} />
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
