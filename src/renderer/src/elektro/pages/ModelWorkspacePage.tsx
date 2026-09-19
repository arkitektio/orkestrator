import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Card } from "@/components/ui/card";
import { ElektroModelWorkspace, ElektroNeuronModel } from "@/linkers";
import { useEffect } from "react";
import { useDetailModelWorkspaceQuery, useDetailNeuronModelQuery } from "../api/graphql";
import { MorphologyScene } from "../components/morphology/MorphologyScene";
import { useActiveWorkspaceStore } from "../lib/activeWorkspaceStore";

export const ModelWorkspacePage = asDetailQueryRoute(
  useDetailModelWorkspaceQuery,
  ({ data }) => {
    const workspace = data.modelWorkspace;
    const mappings = workspace.mappings ?? [];

    const activeWorkspaceId = useActiveWorkspaceStore((s) => s.activeWorkspaceId);
    const activeModelId = useActiveWorkspaceStore((s) => s.activeModelId);
    const setActiveWorkspace = useActiveWorkspaceStore((s) => s.setActiveWorkspace);
    const setActiveModel = useActiveWorkspaceStore((s) => s.setActiveModel);

    // Visiting a workspace makes it the active one, so models saved from the
    // editor while this page is open (or after navigating away) join it.
    useEffect(() => {
      if (activeWorkspaceId !== workspace.id) {
        setActiveWorkspace(workspace.id);
      }
    }, [workspace.id, activeWorkspaceId, setActiveWorkspace]);

    // Fall back to the first model if nothing valid is selected yet.
    const selectedId =
      activeModelId && mappings.some((m) => m.model.id === activeModelId)
        ? activeModelId
        : mappings[0]?.model.id ?? null;

    const { data: selectedDetail } = useDetailNeuronModelQuery({
      variables: { id: selectedId ?? "" },
      skip: !selectedId,
    });

    // Group mappings by their workspace group for the left-hand list.
    const groups = mappings.reduce<Record<string, typeof mappings>>((acc, mapping) => {
      const key = mapping.workspaceGroup || "Ungrouped";
      (acc[key] ??= []).push(mapping);
      return acc;
    }, {});

    return (
      <ElektroModelWorkspace.ModelPage
        variant="black"
        title={workspace.name}
        object={workspace}
        pageActions={
          <div className="flex flex-row gap-2">
            <ElektroModelWorkspace.ObjectButton object={workspace} />
          </div>
        }
      >
        <div className="h-full w-full grid grid-cols-12 grid-reverse gap-4 pointers-events-none p-4">
          <div className="col-span-3 @container bg-black bg-clip-padding backdrop-filter backdrop-blur-2xl bg-opacity-10 z-100 overflow-auto flex flex-col">
            <div className="p-3">
              <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                {workspace.name}
              </h1>
              {workspace.description && (
                <p className="mt-3 text-xl text-muted-foreground">
                  {workspace.description}
                </p>
              )}
            </div>

            {Object.entries(groups).map(([group, items]) => (
              <div key={group} className="flex flex-col gap-2 p-3">
                <div className="font-medium text-sm text-muted-foreground">{group}</div>
                {items.map((mapping) => {
                  const isActive = mapping.model.id === selectedId;
                  return (
                    <Card
                      key={mapping.id}
                      onClick={() => setActiveModel(mapping.model.id)}
                      className={`p-3 cursor-pointer transition-all duration-200 ${
                        isActive ? "ring-2 ring-ring" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium truncate">
                          {mapping.model.name}
                        </div>
                        <ElektroNeuronModel.DetailLink
                          object={mapping.model}
                          className="text-xs text-muted-foreground"
                        >
                          open
                        </ElektroNeuronModel.DetailLink>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ))}

            {mappings.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">
                No models yet. Save a model from the editor while this workspace is
                active and it will appear here.
              </div>
            )}
          </div>

          <div className="col-span-9">
            {selectedDetail?.neuronModel ? (
              <MorphologyScene.Embedded model={selectedDetail.neuronModel} />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                Select a model to preview it
              </div>
            )}
          </div>
        </div>
      </ElektroModelWorkspace.ModelPage>
    );
  },
);

export default ModelWorkspacePage;
