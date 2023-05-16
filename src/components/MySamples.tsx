import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { useDialog } from "../layout/dialog/DialogProvider";
import { Sample } from "../linker";
import { useDeleteSampleMate } from "../mates/sample/useDeleteSampleMutation";
import { withMikro } from "../mikro/MikroContext";
import {
  MySamplesEventDocument,
  MySamplesEventSubscriptionResult,
  MySamplesQuery,
  useMySamplesQuery,
} from "../mikro/api/graphql";
import { SampleCard } from "../mikro/components/cards/SampleCard";
import { DataHomeFilterParams } from "../pages/data/Home";
export type IMySamplesProps = {};

export const SampleType = "Sample";

const limit = 10;

const MySamples: React.FC<IMySamplesProps & DataHomeFilterParams> = ({
  createdDay,
  limit,
}) => {
  const { data, loading, refetch, subscribeToMore } = withMikro(
    useMySamplesQuery
  )({
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
      <ListRender
        array={data?.mysamples}
        loading={loading}
        title={<Sample.ListLink className="flex-0">Stages</Sample.ListLink>}
        refetch={refetch}
      >
        {(s, index) => (
          <SampleCard key={index} sample={s} mates={[deleteSample(s)]} />
        )}
      </ListRender>
    </>
  );
};

export { MySamples };
