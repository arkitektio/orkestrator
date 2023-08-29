import React, { useEffect, useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { MikroRepresentation } from "../linker";
import { useMikroLinkMate } from "../mates/generics/useLinkMate";
import { usePostmanMate } from "../mates/postman/usePostmanMates";
import { withMikro } from "../mikro/MikroContext";
import {
  MyRepresentationsEventDocument,
  MyRepresentationsEventSubscriptionResult,
  MyRepresentationsQuery,
  useMyRepresentationsQuery,
} from "../mikro/api/graphql";
import { RepresentationCard } from "../mikro/components/cards/RepresentationCard";
import { DataHomeFilterParams } from "../mikro/pages/Home";

export type IMyRepresentationsProps = {};

const limit = 20;

const MyRepresentations: React.FC<
  IMyRepresentationsProps & DataHomeFilterParams
> = ({ createdDay, limit }) => {
  const [offset, setOffset] = useState(0);

  const mikroLinkMate = useMikroLinkMate();
  const postmanMate = usePostmanMate();

  const { data, loading, subscribeToMore, refetch } = withMikro(
    useMyRepresentationsQuery
  )({
    variables: {
      limit: limit,
      offset: 0,
      order: ["-created_at"],
      createdDay: createdDay,
    },
    //pollInterval: 1000,
  });

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore({
      document: MyRepresentationsEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        var data = subscriptionData as MyRepresentationsEventSubscriptionResult;
        let action = data.data?.myRepresentations;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          newelements = prev.myrepresentations?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.myrepresentations
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          if (prev.myrepresentations) {
            newelements = [updated_res, ...prev.myrepresentations];
          } else {
            newelements = [updated_res];
          }
        }

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          myrepresentations: newelements,
        } as MyRepresentationsQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  return (
    <>
      <ListRender
        array={data?.myrepresentations}
        loading={loading}
        title={
          <MikroRepresentation.ListLink className="flex-0">
            Images
          </MikroRepresentation.ListLink>
        }
        refetch={refetch}
      >
        {(rep, index) => (
          <RepresentationCard
            rep={rep}
            key={rep?.id}
            mates={[mikroLinkMate, postmanMate]}
          />
        )}
      </ListRender>
    </>
  );
};

export { MyRepresentations };
