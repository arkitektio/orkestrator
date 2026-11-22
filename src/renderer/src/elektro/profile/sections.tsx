import { ElektroGuard } from "@/elektro/api/funcs";
import { ProfileSectionFrame } from "@/core/connection/profile/ProfileSections";
import { ProfileRow, ProfileRows } from "@/core/connection/profile/rows";
import type { ProfileContext, ProfileSection } from "@/core/connection/profile/section";
import { ElektroNeuronModel } from "@/core/linkers";
import { Network } from "lucide-react";
import { Ordering, useListNeuronModelsQuery } from "../api/graphql";

const NeuronModels = ({ sub }: ProfileContext) => {
  const { data } = useListNeuronModelsQuery({
    variables: {
      filters: { createdBy: sub },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 6 },
    },
    fetchPolicy: "cache-and-network",
  });

  const models = data?.neuronModels ?? [];
  if (models.length === 0) return null;

  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {models.map((model) => (
          <ElektroNeuronModel.Smart key={model.id} object={model}>
            <ElektroNeuronModel.DetailLink object={model} className="block hover:text-primary">
              <ProfileRow icon={<Network />} title={model.name} />
            </ElektroNeuronModel.DetailLink>
          </ElektroNeuronModel.Smart>
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

export const ELEKTRO_PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "elektro.models",
    module: "elektro",
    title: "Neuron models",
    icon: Network,
    priority: 50,
    Guard: ElektroGuard,
    Component: NeuronModels,
  },
];
