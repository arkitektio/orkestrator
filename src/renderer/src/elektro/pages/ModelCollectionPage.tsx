import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Card } from "@/core/components/ui/card";
import { ElektroModelCollection, ElektroNeuronModel } from "@/core/linkers";
import { useDetailModelCollectionQuery, useDetailNeuronModelQuery } from "../api/graphql";
// NeuronModelCard import removed; inline expandable cards are used instead
import { useState } from "react";
import { MorphologyScene } from "../components/morphology/MorphologyScene";


export const ModelCollectionPage = asDetailQueryRoute(
  useDetailModelCollectionQuery,
  ({ data }) => {
    const models = data?.modelCollection?.models || [];

    // Selected model id (default to first)
    const [selectedId, setSelectedId] = useState<string | null>(models[0]?.id ?? null);

    // Keep query for detailed model used to render visualizer and show comparisons
    const { data: selectedDetail } = useDetailNeuronModelQuery({
      variables: { id: selectedId ?? "" },
      skip: !selectedId,
    });





    return (
      <ElektroModelCollection.ModelPage
        variant="black"
        title={data?.modelCollection?.name}
        object={data?.modelCollection}
        pageActions={
          <>
            <ElektroModelCollection.ObjectButton alwaysShow object={data.modelCollection} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <ElektroModelCollection.Knowledge object={data.modelCollection} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        {/* Header */}
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.modelCollection.name}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">{data.modelCollection.id}</p>
          </div>
        </div>

        {/* Main: left list (expand selected card), right visualizer */}
        <div className="grid grid-cols-12 gap-4 p-6 h-[70vh]">
          <div className="col-span-4 overflow-auto pr-2">
            <div className="mb-2 font-medium">Models</div>
            <div className="flex flex-col gap-2">
              {models.map((model) => {
                const isOpen = selectedId === model.id;
                return (
                  <Card key={model.id} className={`mx-2 transition-all duration-200 ${isOpen ? "ring-2 ring-ring p-3" : "p-3 cursor-pointer"}`}>
                    <div onClick={() => setSelectedId(model.id)} className="flex items-center justify-between">
                      <div className="text-sm font-medium truncate">{model.name}</div>
                      <ElektroNeuronModel.DetailLink object={model} className="text-xs text-muted-foreground">{model.id}</ElektroNeuronModel.DetailLink>
                    </div>

                    {isOpen && (
                      <div className="mt-3 text-sm">
                        {selectedDetail?.neuronModel ? (
                          <>
                            {selectedDetail.neuronModel.comparisons && selectedDetail.neuronModel.comparisons.length > 0 ? (
                              <div>
                                {selectedDetail.neuronModel.comparisons.map((c, ci) => (
                                  <div key={ci} className="mt-2">
                                    <div className="mt-1 space-y-1">
                                      {c.changes.map((ch, idx) => (
                                        <div key={idx} className="p-2 bg-muted/10 rounded text-xs">
                                          <div className="font-medium">{ch.type}</div>
                                          <div className="text-muted-foreground">Path: {ch.path.join(".")}</div>
                                          <div className="mt-1"><strong>A:</strong> <span className="break-words">{JSON.stringify(ch.valueA)}</span></div>
                                          <div className="mt-1"><strong>B:</strong> <span className="break-words">{JSON.stringify(ch.valueB)}</span></div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">No comparisons for this model</div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">Loading details...</div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="col-span-8 bg-black/5 rounded overflow-hidden">
            <div className="h-full w-full min-h-[500px] bg-black">
              {selectedDetail?.neuronModel ? (
                <MorphologyScene.Embedded model={selectedDetail.neuronModel} />
              ) : (
                <div className="p-6 text-muted-foreground">Select a model to preview visualization</div>
              )}
            </div>
          </div>
        </div>
      </ElektroModelCollection.ModelPage>
    );
  },
);


export default ModelCollectionPage;
