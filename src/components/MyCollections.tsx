import React, { useState } from "react";
import { ListRender } from "../layout/SectionTitle";
import { RekuestCollection } from "../linker";
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
          <RekuestCollection.ListLink className="flex-0">
            Collections
          </RekuestCollection.ListLink>
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
