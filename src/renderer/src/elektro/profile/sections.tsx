import { ElektroGuard } from "@/elektro/api/funcs";
import { ProfileSectionFrame } from "@/core/lib/profile/ProfileSections";
import { ProfileRow, ProfileRows } from "@/core/lib/profile/rows";
import type { ProfileContext, ProfileSection } from "@/core/lib/profile/section";
import { ElektroExperiment, ElektroNeuronModel } from "@/core/linkers";
import { formatDistanceToNow } from "date-fns";
import { BsLightning } from "react-icons/bs";
import { Network } from "lucide-react";
import {
  Ordering,
  useListExperimentsQuery,
  useListNeuronModelsQuery,
} from "../api/graphql";

const Experiments = ({ sub }: ProfileContext) => {
  const { data } = useListExperimentsQuery({
    variables: {
      filters: { createdBy: sub },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit: 6 },
    },
    fetchPolicy: "cache-and-network",
  });

  const experiments = data?.experiments ?? [];
  if (experiments.length === 0) return null;

  return (
    <ProfileSectionFrame>
      <ProfileRows>
        {experiments.map((experiment) => (
          <ElektroExperiment.Smart key={experiment.id} object={experiment}>
            <ElektroExperiment.DetailLink object={experiment} className="block hover:text-primary">
              <ProfileRow
                icon={<BsLightning />}
                title={experiment.name}
                meta={formatDistanceToNow(new Date(experiment.createdAt), { addSuffix: true })}
              />
            </ElektroExperiment.DetailLink>
          </ElektroExperiment.Smart>
        ))}
      </ProfileRows>
    </ProfileSectionFrame>
  );
};

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

const ElektroIcon = ({ className }: { className?: string }) => <BsLightning className={className} />;

export const ELEKTRO_PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: "elektro.experiments",
    module: "elektro",
    title: "Experiments",
    icon: ElektroIcon,
    priority: 40,
    Guard: ElektroGuard,
    Component: Experiments,
  },
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
