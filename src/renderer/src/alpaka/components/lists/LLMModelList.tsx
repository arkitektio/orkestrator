import { ListRender } from "@/core/layout/ListRender";
import { AlpakaLLMModel } from "@/core/linkers";

import { LlmModelFilter, useListLlModelsQuery } from "@/alpaka/api/graphql";
import type { OffsetPaginationInput } from "@/core/layout/pagination";
import LLMModelCard from "../cards/LLMModelCard";

export type Props = {
  filters?: LlmModelFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, error, refetch } = useListLlModelsQuery({
    variables: { filter: filters, pagination },
  });

  if (error) {
    return <div>Error loading models</div>;
  }

  return (
    <ListRender
      array={data?.llmModels}
      title={
        <AlpakaLLMModel.ListLink className="flex-0">
          Large Language Models
        </AlpakaLLMModel.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <LLMModelCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
