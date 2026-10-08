import React from "react";
import { HomeCard, HomeCardMeta, HomeCardTitle } from "@/core/ui/home-card";
import { Brain } from "lucide-react";
import { ElektroNeuronModel } from "@/core/linkers";
import { ListNeuronModelFragment } from "../../api/graphql";


interface Props {
  item: ListNeuronModelFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <ElektroNeuronModel.Smart object={item} hover>
      <HomeCard className={className}>
        <HomeCardTitle icon={<Brain />}>
          <ElektroNeuronModel.DetailLink object={item}>{item.name}</ElektroNeuronModel.DetailLink>
        </HomeCardTitle>
        <HomeCardMeta>Neuron model</HomeCardMeta>
      </HomeCard>
    </ElektroNeuronModel.Smart>
  );
};

export default React.memo(TheCard);