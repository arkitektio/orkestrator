import React, { useEffect, useState } from "react";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Representation } from "../linker";
import {
  MyRepresentationsEventDocument,
  MyRepresentationsEventSubscriptionResult,
  MyRepresentationsQuery,
  useMyRepresentationsQuery,
} from "../mikro/api/graphql";
import { RepresentationCard } from "../mikro/components/cards/RepresentationCard";
import { withMikro } from "../mikro/MikroContext";
import { DataHomeFilterParams } from "../pages/data/Home";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";

export type IMyRepresentationsProps = {};

const limit = 20;

const MyRepresentations: React.FC<
  IMyRepresentationsProps & DataHomeFilterParams
> = ({ createdDay, limit }) => {
  const [offset, setOffset] = useState(0);

  const {
    data: reps,
    loading: all_loading,
    subscribeToMore,
    refetch,
  } = withMikro(useMyRepresentationsQuery)({
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
      {reps && reps.myrepresentations && reps.myrepresentations.length > 0 && (
        <>
          <SectionTitle>
            <div className="flex flex-row">
              <Representation.ListLink className="flex-0">
                Latest Images
              </Representation.ListLink>
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
                {reps.myrepresentations &&
                  reps.myrepresentations.length == limit && (
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
            {reps?.myrepresentations
              ?.slice(0, limit)
              .filter(notEmpty)
              .map((rep, index) => (
                <RepresentationCard rep={rep} key={rep?.id} />
              ))}
          </ResponsiveContainerGrid>
        </>
      )}
    </>
  );
};

export { MyRepresentations };
