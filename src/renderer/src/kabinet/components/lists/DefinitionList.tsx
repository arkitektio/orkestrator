import { ListRender } from "@/core/components/layout/ListRender";
import { KabinetDefinition } from "@/core/linkers";
import {
  DefinitionFilter,
  OffsetPaginationInput,
  useListDefinitionsQuery,
} from "../../api/graphql";
import DefinitionCard from "../cards/DefinitionCard";

export type Props = {
  filters?: DefinitionFilter;
  pagination?: OffsetPaginationInput;
};

const List = (_props: Props) => {
  const { data, refetch } = useListDefinitionsQuery({
    variables: {},
  });

  return (
    <ListRender
      array={data?.definitions}
      title={
        <KabinetDefinition.ListLink className="flex-0 mb-5">
          <h2 className="text-2xl font-bold ">New Actions</h2>
          <div className="text-muted-foreground text-xs mb-3">
            {data?.definitions.length} nodes that your peers have been working
            on
          </div>
        </KabinetDefinition.ListLink>
      }
      refetch={() => refetch()}
    >
      {(ex) => <DefinitionCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
