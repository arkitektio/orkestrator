import { ListRender } from "@/core/layout/ListRender";
import { MikroCollaboration } from "@/core/linkers";
import { useGetCollaborationsQuery } from "../../api/graphql";
import CollaborationCard from "../cards/CollaborationCard";

const List = () => {
  const { data, refetch } = useGetCollaborationsQuery();

  return (
    <ListRender
      array={data?.collaborations}
      title={<MikroCollaboration.ListLink className="flex-0">Collaborations</MikroCollaboration.ListLink>}
      refetch={() => refetch()}
    >
      {(ex) => <CollaborationCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
