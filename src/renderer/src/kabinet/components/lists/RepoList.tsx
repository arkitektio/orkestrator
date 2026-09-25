import { ListRender } from "@/core/components/layout/ListRender";
import { KabinetRepo } from "@/core/linkers";
import {
  GithubRepoFilter,
  OffsetPaginationInput,
  useListReposQuery,
} from "../../api/graphql";
import RepoCard from "../cards/RepoCard";

export type Props = {
  filters?: GithubRepoFilter;
  pagination?: OffsetPaginationInput;
};

const RepoList = ({ filters, pagination }: Props) => {
  const { data, error, refetch } = useListReposQuery({
    variables: {
      filters,
      pagination,
    },
  });

  return (
    <ListRender
      array={data?.repos}
      title={
        <KabinetRepo.ListLink className="flex-0 mb-5">
          <h2 className="text-2xl font-bold">Repos</h2>
          <div className="text-muted-foreground text-xs mb-3">
            {data?.repos.length || 0} repositories connected to Kabinet
          </div>
        </KabinetRepo.ListLink>
      }
      refetch={refetch}
      error={error}
    >
      {(repo) => <RepoCard key={repo.id} item={repo} />}
    </ListRender>
  );
};

export default RepoList;
