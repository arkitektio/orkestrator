import { withOmeroArk } from "@jhnnsrs/omero-ark";
import { ListRender } from "../../../layout/SectionTitle";
import { OmeroArkProject } from "../../../linker";
import { useOpenInOmeroMate } from "../../../mates/omeroweb/useOpenInOmeroMate";
import { useListProjectsQuery } from "../../api/graphql";
import ProjectCard from "../../components/cards/ProjectCard";



const List = () => {
  const { data, error, subscribeToMore, refetch } = withOmeroArk(
    useListProjectsQuery,
  )({
    variables: {  },
  });


  const mate = useOpenInOmeroMate();

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
      {(ex, index) => <ProjectCard key={index} project={ex} mates={[mate(`webclient/?show=project-${ex.id}`)]} />}
    </ListRender>
    </>
  );
};

export default List;
