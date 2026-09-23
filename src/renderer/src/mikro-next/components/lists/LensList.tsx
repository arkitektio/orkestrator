import { ListRender } from "@/components/layout/ListRender";
import { MikroLens } from "@/linkers";
import {
  LensFilter,
  OffsetPaginationInput,
  useGetLensesQuery,
} from "../../api/graphql";
import LensCard from "../cards/LensCard";

export type Props = {
  filters?: LensFilter;
  pagination?: OffsetPaginationInput;
  /** Render nothing rather than an empty list: a dataset page's lens row. */
  hideEmpty?: boolean;
};

const List = ({ filters, pagination, hideEmpty }: Props) => {
  const { data, refetch } = useGetLensesQuery({
    variables: { filters, pagination },
  });

  if (hideEmpty && !data?.lenses.length) return null;

  return (
    <ListRender
      array={data?.lenses}
      title={<MikroLens.ListLink className="flex-0">Lenses</MikroLens.ListLink>}
      refetch={refetch}
      minItemWidth={260}
    >
      {(lens) => <LensCard key={lens.id} item={lens} />}
    </ListRender>
  );
};

export default List;
