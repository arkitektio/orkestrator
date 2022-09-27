import { Maybe } from "graphql/jsutils/Maybe";
import React, { useState } from "react";
import { BsShare } from "react-icons/bs";
import { useNavigate, useParams } from "react-router";
import {
  AvailableModels,
  DetailReservationFragment,
  useDetailReservationQuery,
} from "../../arkitekt/api/graphql";
import { withArkitekt } from "../../arkitekt/arkitekt";
import { ShareModal } from "../../arkitekt/components/dialogs/ShareModal";
import { ReservationPulse } from "../../arkitekt/components/generic/StatusPulse";
import { IconButton } from "../../components/buttons/IconButton";
import { Modal } from "../../components/modals/Modal";
import { ReservationTimeline } from "../../components/timelines/ReserverationTimeline";

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
          <div className="font-light text-2xl dark:text-white">
            {reservation?.node?.name}
          </div>
          <div className="font-light mt-auto ml-4 ">
            {reservation?.node?.package}/{reservation?.node?.interface}
          </div>
        </div>
      </div>
      <div className="flex-grow"></div>
      <div className="flex-none mr-3 dark:text-white">
        <div className="text-black border border-gray-400 bg-white group px-3 py-2 rounded-md inline-flex items-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
          {reservation?.provision?.app?.name ? (
            <>{reservation?.provision?.app?.name}</>
          ) : (
            <>{reservation?.creator?.email}</>
          )}
        </div>
      </div>

      <div className="flex-none mr-3 dark:text-white">
        <div className="text-black border border-gray-400 bg-white group px-3 py-2 rounded-md inline-flex items-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
          <ReservationPulse status={reservation?.status} />
          <span className="ml-3">{reservation?.status}</span>
        </div>
      </div>
      <div className="flex-none"></div>
      {reservation?.id && (
        <Modal child={<IconButton icon={<BsShare />}>Share</IconButton>}>
          <ShareModal
            type={AvailableModels.FacadeReservation}
            object={reservation?.id}
            title="Share Representation"
          />
        </Modal>
      )}
    </div>
  );
};

export type IReservationProps = {};

const ReservationScreen: React.FC<IReservationProps> = ({}) => {
  let { reservation } = useParams<{ reservation: string }>();
  if (!reservation) return <></>;
  let { data, subscribeToMore } = withArkitekt(useDetailReservationQuery)({
    variables: { id: reservation },
  });

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
    <div className="flex flex-col h-full px-6">
      <div className="flex-initial h-20">
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
  );
};

export { ReservationScreen };
