import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { ListRender } from "../../../layout/SectionTitle";
import { OmeroArkProject } from "../../../linker";
import { useListProjectsQuery } from "../../api/graphql";
import ProjectCard from "../../components/cards/ProjectCard";



const List = () => {
  const { data, error, subscribeToMore, refetch } = withOmeroArk(
    useListProjectsQuery,
  )({
    variables: {  },
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
      refetch={refetch}
    >
      {(ex, index) => <ProjectCard key={index} project={ex} mates={[]} />}
    </ListRender>
    </>
  );
};

export default List;
