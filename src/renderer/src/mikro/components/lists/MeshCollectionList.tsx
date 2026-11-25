import { createList } from "@/core/layout/createList";
import { MikroMeshCollection } from "@/core/linkers";
import { useListMeshCollectionsQuery } from "@/mikro/api/graphql";
import MeshCollectionCard from "../cards/MeshCollectionCard";

const TList = createList({
  useHook: useListMeshCollectionsQuery,
  dataKey: "meshCollections",
  ItemComponent: MeshCollectionCard,
  title: "Mesh collections",
  smart: MikroMeshCollection,
  minItemWidth: 220,
  autoHide: false,
  emptyTitle: "No mesh collections yet",
});

export default TList;
