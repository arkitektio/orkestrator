import { ListRender } from "@/components/layout/ListRender";
import { KraphTerm } from "@/linkers";
import {
  StructurePaginationInput,
  TermFilter,
  useListTermsQuery,
} from "../../api/graphql";
import TermCard from "../cards/TermCard";

export type Props = {
  filters?: TermFilter;
  pagination?: StructurePaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListTermsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.terms}
      title={<KraphTerm.ListLink className="flex-0">Terms</KraphTerm.ListLink>}
      refetch={refetch}
    >
      {(ex) => <TermCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
