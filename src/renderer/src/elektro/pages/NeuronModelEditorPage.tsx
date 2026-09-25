import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { ElektroNeuronModel } from "@/core/linkers";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  useAddModelsToWorkspaceMutation,
  useCreateNeuronModelMutation,
  useDetailNeuronModelQuery,
} from "../api/graphql";
import { NeuronEditor } from "../components/NeuronEditor";
import { useActiveWorkspaceStore } from "../lib/activeWorkspaceStore";
import {
  EditableModelConfig,
  serializeModelConfig,
  validateModelConfig,
} from "../lib/modelSerialization";

export const NeuronModelEditorPage = asDetailQueryRoute(
  useDetailNeuronModelQuery,
  ({ data }) => {
    const [createModel] = useCreateNeuronModelMutation();
    const [addModelsToWorkspace] = useAddModelsToWorkspaceMutation();
    const navigate = useNavigate();

    const handleSave = async (config: EditableModelConfig) => {
      // Refuse to send a structurally broken model; surface the reason.
      const validation = validateModelConfig(config);
      if (!validation.ok) {
        validation.errors.slice(0, 3).forEach(e => toast.error(e.message));
        if (validation.errors.length > 3) {
          toast.error(`…and ${validation.errors.length - 3} more validation error(s).`);
        }
        return;
      }
      // Non-blocking concerns (e.g. disconnected roots) — warn but proceed.
      validation.warnings.slice(0, 3).forEach(w => toast.warning(w.message));

      try {
        const result = await createModel({
          variables: {
            input: {
              name: `${data.neuronModel.name} (Edited)`,
              description: `Edited version of ${data.neuronModel.name}`,
              // Track lineage: the new model descends from the one we edited.
              parent: data.neuronModel.id,
              config: serializeModelConfig(config)
            }
          }
        });
        const newId = result.data?.createNeuronModel?.id;
        toast.success("Model saved successfully!");

        // If a workspace is active, the freshly saved model joins it. Best-effort:
        // a workspace error must never block saving the model itself.
        const { activeWorkspaceId, setActiveModel } = useActiveWorkspaceStore.getState();
        if (newId && activeWorkspaceId) {
          try {
            await addModelsToWorkspace({
              variables: {
                input: { workspace: activeWorkspaceId, models: [newId] },
              },
            });
            setActiveModel(newId);
          } catch (workspaceError) {
            console.error(workspaceError);
            toast.error("Saved, but could not add the model to the active workspace");
          }
        }

        if (newId) {
          // Open the freshly saved model.
          navigate(ElektroNeuronModel.linkBuilder(newId));
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to save model");
      }
    };

    return (
      <ElektroNeuronModel.ModelPage
        variant="black"
        title={`Edit: ${data.neuronModel.name}`}
        object={data.neuronModel}
      >
        <div className="h-full w-full">
          <NeuronEditor initialModel={data.neuronModel} onSave={handleSave} />
        </div>
      </ElektroNeuronModel.ModelPage>
    );
  },
);


export default NeuronModelEditorPage;
