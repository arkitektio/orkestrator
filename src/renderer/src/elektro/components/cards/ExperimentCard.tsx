import React from "react";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { FlaskConical } from "lucide-react";
import { ElektroExperiment } from "@/core/linkers";
import { ListExperimentFragment } from "../../api/graphql";


interface Props {
  item: ListExperimentFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroExperiment.Smart object={item} hover>
      <HomeCard className={className}>
        <HomeCardTitle icon={<FlaskConical />}>
          <ElektroExperiment.DetailLink object={item}>{item.name}</ElektroExperiment.DetailLink>
        </HomeCardTitle>
        <HomeCardMeta>Experiment</HomeCardMeta>
      </HomeCard>
    </ElektroExperiment.Smart>
  );
};

export default React.memo(TheCard);