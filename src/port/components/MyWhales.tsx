import React, { useEffect } from "react";
import Timestamp from "react-timestamp";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { SectionTitle } from "../../layout/SectionTitle";
import { Whale } from "../../linker";
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
  const { data, error, loading, subscribeToMore } = withPort(useWhalesQuery)(
    {}
  );

  const deleteWhaleMate = useDeleteWhaleMate();
  const whaleLifecyleMate = useWhaleLifecycleMate();

  const { confirm } = useConfirm();

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
      <Whale.ListLink>
        <SectionTitle>My Whales</SectionTitle>
      </Whale.ListLink>
      <br />
      <ResponsiveContainerGrid>
        {data?.whales?.filter(notEmpty).map((whale, index) => (
          <Whale.Smart
            key={index}
            object={whale.id}
            className="max-w-sm rounded  shadow-md bg-slate-800 text-white group relative"
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
              className="p-2"
              style={{
                zIndex: 100,
              }}
            >
              <div className="flex">
                <span className="flex-grow font-semibold text-xs">
                  {whale?.deployment.image}
                </span>
              </div>
              <Whale.DetailLink
                className="text-xl font-light cursor-pointer mb-1"
                object={whale?.id}
              >
                {whale?.deployment.version}
              </Whale.DetailLink>
              <div className="text-xs pb-2">
                Build:{" "}
                {whale.latestPull && (
                  <Timestamp date={whale.latestPull} relative={true} />
                )}
              </div>
            </div>
          </Whale.Smart>
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};

export { MyWhales };
