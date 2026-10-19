import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { ElektroNeuronModel } from "@/core/linkers";
import { reportError, toast } from "@/core/notify";
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
import { ELEKTRO_HELP } from "../help";

/** The first message, and how many more there are (the toast shows two lines). */
const summarize = (messages: string[]) =>
  messages.length > 1 ? `${messages[0]} (and ${messages.length - 1} more)` : messages[0];

export const NeuronModelEditorPage = asDetailQueryRoute(
  useDetailNeuronModelQuery,
  ({ data }) => {
    const [createModel] = useCreateNeuronModelMutation();
    const [addModelsToWorkspace] = useAddModelsToWorkspaceMutation();
    const navigate = useNavigate();

    const handleSave = async (config: EditableModelConfig) => {
      // Refuse to send a structurally broken model; surface the reason, in
      // one toast however many problems there are.
      const validation = validateModelConfig(config);
      if (!validation.ok) {
        toast.error("Couldn't save the model", {
          id: "neuron-model-validation",
          description: summarize(validation.errors.map((e) => e.message)),
        });
        return;
      }
      // Non-blocking concerns (e.g. disconnected roots) — warn but proceed.
      if (validation.warnings.length > 0) {
        toast.warning("The model has warnings", {
          id: "neuron-model-validation",
          description: summarize(validation.warnings.map((w) => w.message)),
        });
      }

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
        // Opening the saved model below is the confirmation.
        const newId = result.data?.createNeuronModel?.id;

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
            reportError(workspaceError, "Saved, but couldn't add the model to the active workspace");
          }
        }

        if (newId) {
          // Open the freshly saved model.
          navigate(ElektroNeuronModel.linkBuilder(newId));
        }
      } catch (e) {
        reportError(e, "Couldn't save the model");
      }
    };

    return (
      <ElektroNeuronModel.ModelPage
        variant="black"
        title={`Edit: ${data.neuronModel.name}`}
        help={ELEKTRO_HELP.neuronModelEditor}
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
