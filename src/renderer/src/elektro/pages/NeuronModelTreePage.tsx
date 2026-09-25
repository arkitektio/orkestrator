import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { buttonVariants } from "@/core/components/ui/button";
import { ElektroNeuronModel } from "@/core/linkers";
import { useDetailNeuronModelQuery } from "../api/graphql";
import { NeuronModelTree } from "../components/tree/NeuronModelTree";

export const NeuronModelTreePage = asDetailQueryRoute(
  useDetailNeuronModelQuery,
  ({ data }) => {
    return (
      <ElektroNeuronModel.ModelPage
        title={data?.neuronModel?.name}
        object={data.neuronModel}
        pageActions={
          <>
            <ElektroNeuronModel.DetailLink
              object={data.neuronModel}
              className={buttonVariants({ variant: "outline" })}
            >
              3D View
            </ElektroNeuronModel.DetailLink>
            <ElektroNeuronModel.DetailLink
              object={data.neuronModel}
              subroute="edit"
              className={buttonVariants({ variant: "outline" })}
            >
              Edit
            </ElektroNeuronModel.DetailLink>
            <ElektroNeuronModel.ObjectButton alwaysShow object={data.neuronModel} />
          </>
        }
      >
        <div className="h-full w-full p-4">
          <NeuronModelTree model={data.neuronModel} />
        </div>
      </ElektroNeuronModel.ModelPage>
    );
  },
);

export default NeuronModelTreePage;
