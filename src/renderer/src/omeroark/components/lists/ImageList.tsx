import { ListRender } from "@/core/layout/ListRender";
import { OmeroArkImage } from "@/core/linkers";
import { useListOmeroImagesQuery } from "@/omeroark/api/graphql";
import ImageCard from "../cards/ImageCard";

const List = () => {
  const { data, loading, error, refetch } = useListOmeroImagesQuery();

  return (
    <ListRender
      array={data?.images}
      loading={loading}
      error={error}
      title={<OmeroArkImage.ListLink className="flex-0">Images</OmeroArkImage.ListLink>}
      // The query takes no variables, so paging has nothing to send.
      refetch={() => refetch()}
    >
      {(item) => <ImageCard key={item.id} image={item} />}
    </ListRender>
  );
};

export default List;
