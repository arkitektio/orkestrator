import { ListRender } from "@/core/layout/ListRender";
import { OmeroArkImage } from "@/core/linkers";
import {
  ImageFilter,
  OffsetPaginationInput,
  useListOmeroImagesQuery,
} from "@/omeroark/api/graphql";
import ImageCard from "../cards/ImageCard";

export type Props = {
  filters?: ImageFilter;
  pagination?: OffsetPaginationInput;
};

// One page, the size ListRender pages by: an OMERO server easily holds more
// images than one grid should ask for at once.
const DEFAULT_PAGINATION: OffsetPaginationInput = { limit: 20, offset: 0 };

const List = ({ filters, pagination = DEFAULT_PAGINATION }: Props) => {
  const { data, loading, error, refetch } = useListOmeroImagesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.images}
      loading={loading}
      error={error}
      title={<OmeroArkImage.ListLink className="flex-0">Images</OmeroArkImage.ListLink>}
      limit={pagination.limit ?? undefined}
      // Paging sends the next page's offset through the query's `pagination`.
      refetch={refetch}
    >
      {(item) => <ImageCard key={item.id} image={item} />}
    </ListRender>
  );
};

export default List;
