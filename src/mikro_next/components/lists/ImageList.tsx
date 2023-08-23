import { PaginatedList } from "../../../layout/PaginatedList";
import { Image } from "../../../next_linker";
import { withMikroNext } from "../../MikroNextContext";
import {
  ImageFilter,
  OffsetPaginationInput,
  useGetImagesQuery,
} from "../../api/graphql";
import ImageCard from "../cards/ImageCard";

export type Props = {
  filters?: ImageFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, subscribeToMore, refetch } = withMikroNext(
    useGetImagesQuery
  )({
    variables: { filters, pagination },
  });

  return (
    <PaginatedList
      array={data?.images}
      title={<Image.ListLink className="flex-0">Images</Image.ListLink>}
      refetch={refetch}
    >
      {(ex, index) => <ImageCard key={index} image={ex} mates={[]} />}
    </PaginatedList>
  );
};

export default List;
