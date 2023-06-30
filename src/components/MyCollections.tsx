import React, { useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { Collection } from "../linker";
import { withRekuest } from "../rekuest";
import { useCollectionsQuery } from "../rekuest/api/graphql";
import { CollectionCard } from "../rekuest/components/cards/CollectionCard";

export type IMyRepresentationsProps = {};

const limit = 20;

const MyCollections: React.FC<IMyRepresentationsProps> = () => {
  const [offset, setOffset] = useState(0);

  const { data, loading, subscribeToMore, refetch } = withRekuest(
    useCollectionsQuery
  )({
    variables: {
      limit: limit,
      offset: 0,
    },
    //pollInterval: 1000,
  });

  return (
    <>
      <ListRender
        array={data?.collections}
        loading={loading}
        title={
          <Collection.ListLink className="flex-0">
            Collections
          </Collection.ListLink>
        }
        refetch={refetch}
      >
        {(item, index) => (
          <CollectionCard collection={item} key={item?.id} mates={[]} />
        )}
      </ListRender>
    </>
  );
};

export { MyCollections };
