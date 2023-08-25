import { MikroExperiment } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListExperimentFragment } from "../../api/graphql";

interface ExperimentCardProps {
  experiment: ListExperimentFragment;
  mates: MateFinder[];
}

export const ExperimentCard = ({ experiment, mates }: ExperimentCardProps) => {
  return (
    <MikroExperiment.Smart
      object={experiment.id}
      dragClassName={() => "bg-back-800 p-4 text-white rounded shadow-lg"}
    >
      <MikroExperiment.DetailLink object={experiment.id}>
        {experiment.name}
      </MikroExperiment.DetailLink>
    </MikroExperiment.Smart>
  );
};
