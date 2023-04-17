import React, { useEffect, useState } from "react";
import { BsCaretLeft, BsCaretRight, BsPlusCircle } from "react-icons/bs";
import { notEmpty } from "../floating/utils";
import { ActionButton } from "../layout/ActionButton";
import { useDialog } from "../layout/dialog/DialogProvider";
import { SectionTitle } from "../layout/SectionTitle";
import { Sample } from "../linker";
import { useDeleteSampleMate } from "../mates/sample/useDeleteSampleMutation";
import {
  MySamplesEventDocument,
  MySamplesEventSubscriptionResult,
  MySamplesQuery,
  useMySamplesQuery,
} from "../mikro/api/graphql";
import { SampleCard } from "../mikro/components/cards/SampleCard";
import { CreateSampleModal } from "../mikro/components/dialogs/CreateSampleModal";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
export type IMySamplesProps = {};

export const SampleType = "Sample";

const limit = 10;

const MySamples: React.FC<IMySamplesProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const {
    data: samples,
    loading,
    refetch,
    subscribeToMore,
  } = withMikro(useMySamplesQuery)({
    variables: { limit: limit, offset: 0, createdDay: createdDay },
  });

  const deleteSample = useDeleteSampleMate();

  const [show, setshow] = useState(false);
  const { ask } = useDialog();

  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit, offset: offset });
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
    <>
      <SectionTitle>
        <div className="flex flex-row">
          <Sample.ListLink className="flex-0">Samples</Sample.ListLink>
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
            {samples?.mysamples && samples?.mysamples.length == limit && (
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
      </SectionTitle>
      <ResponsiveContainerGrid>
        {samples?.mysamples?.filter(notEmpty).map((sample, index) => (
          <SampleCard
            key={index}
            sample={sample}
            mates={[deleteSample(sample)]}
          />
        ))}
        <div className="flex flex-row">
          <ActionButton
            label="Create new Sample"
            description="Create a new sample"
            className="text-white "
            onAction={async () => {
              await ask(CreateSampleModal, {});
              await refetch();
            }}
          >
            <BsPlusCircle />
          </ActionButton>
        </div>
      </ResponsiveContainerGrid>
    </>
  );
};

export { MySamples };
