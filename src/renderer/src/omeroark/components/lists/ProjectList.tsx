import { ListRender } from "@/core/layout/ListRender";
import { OmeroArkProject } from "@/core/linkers";
import {
  OffsetPaginationInput,
  ProjectFilter,
  SortDirection,
  useListProjectsQuery,
} from "@/omeroark/api/graphql";
import ProjectCard from "../cards/ProjectCard";

export type Props = {
  filters?: ProjectFilter;
  pagination?: OffsetPaginationInput;
  /** The list's heading; a link to the full list by default. */
  title?: React.ReactNode;
};

// Newest first, ordered by OMERO: the page it asks for is the newest one.
const NEWEST_FIRST = [{ id: SortDirection.Desc }];

// One page, the size ListRender pages by: an OMERO server can hold far more
// projects than one grid should ask for at once.
const DEFAULT_PAGINATION: OffsetPaginationInput = { limit: 20, offset: 0 };

const List = ({ filters, pagination = DEFAULT_PAGINATION, title }: Props) => {
  const { data, error, refetch } = useListProjectsQuery({
    variables: { filters, pagination, ordering: NEWEST_FIRST },
  });

  return (
    <>
      {error && <div>Error: {error.message}</div>}
      <ListRender
        array={data?.projects}
        title={
          title ?? (
            <OmeroArkProject.ListLink className="flex-0">
              Projects
            </OmeroArkProject.ListLink>
          )
        }
        limit={pagination.limit ?? undefined}
        refetch={refetch}
      >
        {(ex) => <ProjectCard key={ex.id} project={ex} />}
      </ListRender>
    </>
  );
};

export default List;
