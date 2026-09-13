import { ListRender } from "@/components/layout/ListRender";

import {
  ChromaCollectionFilter,
  useListChromaCollectionsQuery
} from "@/alpaka/api/graphql";
import {
  OffsetPaginationInput
} from "@/lok-next/api/graphql";
import CollectionCard from "../cards/CollectionCard";

export type Props = {
  filters?: ChromaCollectionFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } =
    useListChromaCollectionsQuery({
      variables: { filter: filters, pagination },
    });

  return (
    <ListRender
      array={data?.chromaCollections}
      title={
        <div className="flex-0">
          Chroma Collections
        </div>
      }
      refetch={refetch}
    >
      {(ex) => <CollectionCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
