import { Maybe } from "graphql/jsutils/Maybe";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ReservationTimeline } from "../../../components/timelines/ReserverationTimeline";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { RekuestAssignation, RekuestNode } from "../../../linker";
import { useDialog } from "../../../providers/dialog/DialogProvider";
import { withRekuest } from "../../../rekuest";
import {
  DetailReservationFragment,
  useDetailReservationQuery,
} from "../../../rekuest/api/graphql";
import { LinkProvisionDialog } from "../../../rekuest/components/dialogs/LinkProvisionDialog";
import { ReservationPulse } from "../../../rekuest/components/generic/StatusPulse";
import { useRequester } from "../../providers/requester/requester-context";

export type ReservationToolbarProps = {
  reservation: Maybe<DetailReservationFragment>;
};

export const ReservationToolbar: React.FC<ReservationToolbarProps> = ({
  reservation,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const navigate = useNavigate();

  return (
    <div className="flex flex-row w-100">
      <div className="flex-initial">
        <div className="flex flex-row">
          <div className="mr-2 my-auto">
            <ReservationPulse status={reservation?.status} />
          </div>
          <div className="font-light text-2xl dark:text-white">
            {reservation?.node.id && (
              <RekuestNode.DetailLink object={reservation?.node?.id}>
                {reservation?.node?.name}
              </RekuestNode.DetailLink>
            )}
          </div>
          <div className="font-light mt-auto ml-4 flex-row dark:text-white flex truncate">
            {reservation?.provisions
              .map((prov) => prov.template?.interface)
              .join(", ")}
          </div>
        </div>
      </div>
      <div className="flex-grow"></div>

      <div className="flex-none mr-3 dark:text-white">
        <div className=" group px-3 py-2 rounded-md inline-flex items-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"></div>
      </div>
      <div className="flex-none"></div>
    </div>
  );
};

export type IReservationProps = {};

const DashboardReservation: React.FC<IReservationProps> = ({}) => {
  let { reservation } = useParams<{ reservation: string }>();
  if (!reservation) return <></>;
  let { data, subscribeToMore, refetch } = withRekuest(
    useDetailReservationQuery
  )({
    variables: { id: reservation },
  });

  const { ask } = useDialog();

  const { assign } = useRequester();
  const navigate = useNavigate();

  const is_mechanical = data?.reservation?.provision;

  /* useEffect(() => {
		const unsubscribe = subscribeToMore({
			document: ReservationEventDocument,
			variables: { reference: reference },
			updateQuery: (prev, { subscriptionData }) => {
				let action = subscriptionData as ReservationEventSubscriptionResult;
				let event = action.data?.reservationEvent;

				if (event?.log) {
					let newLog = {
						__typename: 'ReservationLog',
						message: event.log.message,
						level: event.log.level,
					};
					return {
						...prev,
						reservation: {
							...prev.reservation,
							log: [...(prev.reservation?.log as []), newLog],
						},
					} as DetailReservationQuery;
				}

				return prev;
			},
		});
		return () => unsubscribe();
	}, [reference]); */

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            onAction={async () => {
              if (data?.reservation) {
                let x = await assign({ reservation: data?.reservation });
                x?.id && navigate(RekuestAssignation.linkBuilder(x.id));
              }
            }}
            label="Assign"
            description="Assign this reservation to a node"
          />
          <ActionButton
            onAction={async () => {
              if (data?.reservation) {
                let x = await ask(LinkProvisionDialog, {
                  reservation: data?.reservation,
                });
              }
            }}
            label="Link"
            description="Link a new provision to this reservation"
          />
        </>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-initial flex flex-row">
          {data?.reservation && (
            <ReservationToolbar reservation={data.reservation} />
          )}
        </div>
        <div className="flex-grow">
          {data?.reservation && (
            <ReservationTimeline reservation={data?.reservation} />
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export { DashboardReservation };
