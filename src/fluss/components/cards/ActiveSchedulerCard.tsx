import { FlussRun, RekuestReservation } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListReservationFragment } from "../../../rekuest/api/graphql";

export const ActiveSchedulerCard = ({
  reservation,
  mates,
}: {
  reservation: ListReservationFragment;
  mates: MateFinder[];
}) => {
  return (
    <RekuestReservation.Smart
      object={reservation.id}
      className="max-w-sm rounded  shadow-md bg-slate-800 text-white group"
      mates={mates}
    >
      <div className="p-2 ">
        <div className="flex">
          <span className="flex-grow font-semibold text-xs">
            {reservation.title && reservation.node.name}
          </span>
        </div>
        <FlussRun.DetailLink
          className="text-xl font-light cursor-pointer mb-1"
          object={reservation?.id}
        >
          {reservation.status}
        </FlussRun.DetailLink>
      </div>
      <div className="pl-2 pb-2"></div>
    </RekuestReservation.Smart>
  );
};
