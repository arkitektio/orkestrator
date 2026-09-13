import { ListRender } from "@/components/layout/ListRender";
import { OmeroArkProject } from "@/linkers";
import { useListProjectsQuery } from "@/omero-ark/api/graphql";
import ProjectCard from "../cards/ProjectCard";

const List = () => {
  const { data, error, refetch } = useListProjectsQuery({
    variables: {},
  });

  return (
    <>
      {error && <div>Error: {error.message}</div>}
      <ListRender
        array={data?.projects}
        title={
          <OmeroArkProject.ListLink className="flex-0">
            Projects
          </OmeroArkProject.ListLink>
        }
        refetch={() => refetch()}
      >
        {(ex) => <ProjectCard key={ex.id} project={ex} />}
      </ListRender>
    </>
  );
};

export default List;
