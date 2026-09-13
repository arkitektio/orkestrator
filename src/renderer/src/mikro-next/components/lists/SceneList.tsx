import { ListRender } from "@/components/layout/ListRender";
import { MikroScene } from "@/linkers";
import {
  FolderFilter,
  OffsetPaginationInput,
  useGetScenesQuery,
} from "../../api/graphql";
import SceneCard from "../cards/SceneCard";

export type Props = {
  filters?: FolderFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useGetScenesQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.scenes}
      title={
        <MikroScene.ListLink className="flex-0">Scenes</MikroScene.ListLink>
      }
      refetch={refetch}
      // The card is its scene's snapshot; the grid's default ladder would pack
      // that picture into a column too narrow to recognise it in.
      minItemWidth={260}
    >
      {(ex) => <SceneCard key={ex.id} scene={ex} />}
    </ListRender>
  );
};

export default List;
