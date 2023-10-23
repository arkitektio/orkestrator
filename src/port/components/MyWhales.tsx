import React, { useEffect } from "react";
import Timestamp from "react-timestamp";
import { ListRender } from "../../layout/SectionTitle";
import { PortWhale } from "../../linker";
import { useDeleteWhaleMate } from "../../mates/whale/useDeleteWhaleMate";
import { useWhaleLifecycleMate } from "../../mates/whale/useWhaleLifecycleMate";
import { withPort } from "../PortContext";
import {
  ListWhaleFragment,
  MyWhalesUpdateDocument,
  MyWhalesUpdateSubscription,
  WhaleEvent,
  useWhalesQuery,
} from "../api/graphql";
export type IMyGraphsProps = {};

export type DisplayWhale = ListWhaleFragment & { latestEvent?: WhaleEvent };

const MyWhales: React.FC<IMyGraphsProps> = ({}) => {
  const { data, error, loading, subscribeToMore, refetch } = withPort(
    useWhalesQuery
  )({
    variables: {
      limit: 20,
    },
  });

  const deleteWhaleMate = useDeleteWhaleMate();
  const whaleLifecyleMate = useWhaleLifecycleMate();

  useEffect(() => {
    if (!subscribeToMore) return;
    let x = subscribeToMore<MyWhalesUpdateSubscription>({
      document: MyWhalesUpdateDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newEvent = subscriptionData.data.whalesEvent;
        const newWhales = prev?.whales?.map((w) =>
          w?.id == newEvent?.whale ? { ...w, latestEvent: newEvent } : w
        );
        return {
          whales: newWhales?.slice(),
        };
      },
    });
    return () => x();
  }, [subscribeToMore]);

  return (
    <div>
      <ListRender
        title={<PortWhale.ListLink>Authorized Apps</PortWhale.ListLink>}
        array={data?.whales}
        refetch={refetch}
      >
        {(whale, index) => (
          <PortWhale.Smart
            key={index}
            object={whale.id}
            className="max-w-sm rounded  shadow-md bg-slate-800 text-white group relative "
            mates={[deleteWhaleMate(whale), whaleLifecyleMate]}
          >
            <div
              className={`absolute top-0 opacity-40 left-0 h-full bg-green-300 border-green-300 rounded transition-width duration-100 ease-in-out`}
              style={{
                zIndex: 1,
                width: `${
                  whale?.latestEvent?.pull?.progress != undefined &&
                  whale?.latestEvent?.pull?.progress != 1
                    ? Math.floor(whale?.latestEvent?.pull?.progress * 100)
                    : 0
                }%`,
              }}
            ></div>
            <div
              className="p-2 truncate"
              style={{
                zIndex: 100,
              }}
            >
              <div className="flex">
                <span className="flex-grow font-semibold text-xs">
                  {whale?.deployment.manifest.identifier}
                </span>
              </div>
              <PortWhale.DetailLink
                className="text-xl font-light cursor-pointer mb-1"
                object={whale?.id}
              >
                {whale?.deployment.image}
              </PortWhale.DetailLink>
              {whale.latestPull ? (
                <div className="text-xs pb-2">
                  Last updated:{" "}
                  {whale.latestPull && (
                    <Timestamp date={whale.latestPull} relative={true} />
                  )}
                </div>
              ) : (
                <>
                  <div className="text-xs pb-2">
                    <span className="font-semibold">
                      ⚠️ Will download on deploy
                    </span>
                  </div>
                </>
              )}
              {whale?.latestEvent?.pull?.progress != undefined &&
                whale?.latestEvent?.pull?.progress != 1 && (
                  <div className="animate-pulse">Downloading</div>
                )}
            </div>
          </PortWhale.Smart>
        )}
      </ListRender>
    </div>
  );
};

export { MyWhales };
