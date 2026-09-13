import { ListRender } from "@/components/layout/ListRender";
import { RekuestAction } from "@/linkers";
import {
  OffsetPaginationInput,
  ShortcutFilter,
  useShortcutsQuery
} from "@/rekuest/api/graphql";
import ShortcutCard from "../cards/ShortcutCard";

export type Props = {
  filters?: ShortcutFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useShortcutsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.shortcuts}
      title={
        <RekuestAction.ListLink className="flex-0">
          Toolboxes
        </RekuestAction.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <ShortcutCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
