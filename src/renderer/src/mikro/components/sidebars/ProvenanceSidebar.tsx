import { ListRender } from "@/core/layout/ListRender";
import { ProvenanceEntryFragment } from "@/mikro/api/graphql";
import HistoryCard from "../cards/HistoryCard";

export const ProvenanceSidebar = (props: {
  items: ProvenanceEntryFragment[] | undefined;
}) => {
  return (
    <div className="p-3">
      <ListRender array={props.items}>
        {(item, i) => <HistoryCard history={item} key={i} />}
      </ListRender>
    </div>
  );
};
