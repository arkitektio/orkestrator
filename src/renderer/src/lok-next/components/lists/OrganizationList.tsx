import { ListRender } from "@/components/layout/ListRender";
import {
  OffsetPaginationInput,
  OrganizationFilter,
  useListOrganizationsQuery
} from "@/lok-next/api/graphql";
import OrganizationCard from "../cards/OrganizationCard";

export type Props = {
  filters?: OrganizationFilter;
  pagination?: OffsetPaginationInput;
};

const OrganizationList = ({ filters, pagination }: Props) => {
  const { data, refetch } = useListOrganizationsQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.organizations}
      title="Organizations"
      refetch={refetch}
    >
      {(ex) => <OrganizationCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default OrganizationList;
