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
import { Sample } from "../linker";
import {
  ListSampleFragment,
  MySamplesEventDocument,
  MySamplesEventSubscriptionResult,
  MySamplesQuery,
  useDeleteSampleMutation,
  useMySamplesQuery,
} from "../mikro/api/graphql";
import { CreateSampleModal } from "../mikro/components/dialogs/CreateSampleModal";
import { withMikro } from "../mikro/MikroContext";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMySamplesProps = {};

export const SampleType = "Sample";

const limit = 20;

export const SampleCard: React.FC<{
  sample: Maybe<ListSampleFragment>;
}> = ({ sample }) => {
  const { confirm } = useConfirm();

  const [deleteSample, res] = withMikro(useDeleteSampleMutation)();

  if (!sample?.id) return <></>;

  return (
    <Sample.Smart
      object={sample?.id}
      className={
        "bg-slate-700 text-white rounded shadow-md pl-3 truncate group"
      }
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@mikro/sample") {
          return [
            {
              accepts: [accept],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await deleteSample({
                  variables: { id: sample.id },
                });
              },
              label: <BsTrash />,
              description: "Delete Sample",
            },
          ];
        }

        if (accept == "list:@mikro/sample") {
          return [
            {
              accepts: ["list:@mikro/sample"],
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want all this samples delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                for (const drop of drops) {
                  await deleteSample({
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
      <div className="my-2">
        <Sample.DetailLink
          className="cursor-pointer font-semibold"
          object={sample.id}
        >
          {sample?.name}
        </Sample.DetailLink>
      </div>
    </Sample.Smart>
  );
};

const MySamples: React.FC<IMySamplesProps> = () => {
  const {
    data: samples,
    loading,
    refetch,
    subscribeToMore,
  } = withMikro(useMySamplesQuery)({
    //pollInterval: 1000,
  });

  const [show, setshow] = useState(false);

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  useEffect(() => {
    console.log("Subscribing to My MySamples");
    const unsubscribe = subscribeToMore({
      document: MySamplesEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Experiment", subscriptionData);
        var data = subscriptionData as MySamplesEventSubscriptionResult;
        let action = data.data?.mySamples;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          newelements = prev.mysamples?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.mysamples
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          newelements = prev.mysamples?.concat(updated_res);
        }

        console.log("Receissved ", subscriptionData);
        return { ...prev, mysamples: newelements } as MySamplesQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  return (
    <div>
      <div className="font-light text-xl flex mr-2 dark:text-white">
        <Sample.ListLink className="flex-0">Latest Samples</Sample.ListLink>
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
          {samples?.mysamples && samples?.mysamples.length == limit && (
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
        {samples?.mysamples?.map((sample, index) => (
          <SampleCard key={index} sample={sample} />
        ))}
        <div className="flex flex-row">
          <ActionButton
            label="Create new Sample"
            description="Create a new sample"
            className="text-white "
            onAction={async () => setshow(true)}
          >
            <BsPlusCircle />
          </ActionButton>
          <CreateSampleModal show={show} setShow={setshow} />
        </div>
      </ResponsiveGrid>
    </div>
  );
};

export { MySamples };
