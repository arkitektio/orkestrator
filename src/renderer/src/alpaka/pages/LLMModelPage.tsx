import { useDialog } from "@/app/dialog";
import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { PageAction } from "@/components/ui/page-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlpakaCollection, AlpakaLLMModel, AlpakaProvider } from "@/linkers";
import { MessageSquare } from "lucide-react";
import {
  useGetLlmModelQuery
} from "../api/graphql";
import { formatDisplayToken } from "../components/cards/LLMModelCard";
import {
  getProviderKindDisplayName,
  ProviderKindIcon,
} from "../components/cards/ProviderCard";

export const TPage =  asDetailQueryRoute(
  useGetLlmModelQuery,
  ({ data, subscribeToMore: _subscribeToMore }) => {
    const { openDialog } = useDialog();
    const model = data.llmModel;

    return (
      <AlpakaLLMModel.ModelPage
        title={model.llmString}
        object={model}
        pageActions={
          <>
            {/* Talking to the model is what the page is for. */}
            <PageAction
              alwaysShow
              collapse="icon"
              icon={<MessageSquare className="h-4 w-4" />}
              onClick={() => openDialog("chat", { model: model.id })}
              size="sm"
            >
              Chat
            </PageAction>
            <PageAction
              onClick={() => openDialog("usemodelfor", { model: model.id })}
              size="sm"
            >
              Use For...
            </PageAction>
            <AlpakaLLMModel.ObjectButton alwaysShow object={model} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <AlpakaLLMModel.Knowledge object={model} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/60 bg-card">
            <CardContent className="flex flex-col gap-6 pt-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-muted/60">
                  <ProviderKindIcon kind={model.provider.kind} className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline" className="rounded-full">
                    {getProviderKindDisplayName(model.provider.kind)}
                  </Badge>
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">{model.llmString}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{model.modelId}</p>
                  </div>
                  <AlpakaProvider.DetailLink
                    object={model.provider}
                    className="inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    by {model.provider.name}
                  </AlpakaProvider.DetailLink>
                </div>
              </div>

              <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Features</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{model.features.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Inputs</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{model.inputModalities.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Collections</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{model.embedderFor.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="border-border/60 xl:col-span-1">
              <CardHeader>
                <CardTitle>Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AlpakaProvider.DetailLink
                  object={model.provider}
                  className="block rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                >
                  <div className="text-sm font-medium text-foreground">{model.provider.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {getProviderKindDisplayName(model.provider.kind)} provider
                  </div>
                </AlpakaProvider.DetailLink>

                {model.provider.models.length > 1 ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Other models from this provider
                    </div>
                    <div className="space-y-2">
                      {model.provider.models
                        .filter((providerModel) => providerModel.id !== model.id)
                        .slice(0, 4)
                        .map((providerModel) => (
                          <AlpakaLLMModel.DetailLink
                            key={providerModel.id}
                            object={providerModel}
                            className="block rounded-xl border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                          >
                            {providerModel.modelId}
                          </AlpakaLLMModel.DetailLink>
                        ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/60 xl:col-span-1">
              <CardHeader>
                <CardTitle>Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Features</div>
                  <div className="flex flex-wrap gap-2">
                    {model.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="rounded-full">
                        {formatDisplayToken(feature)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Input Modalities</div>
                  <div className="flex flex-wrap gap-2">
                    {model.inputModalities.map((modality) => (
                      <Badge key={modality} variant="outline" className="rounded-full">
                        {formatDisplayToken(modality)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Output Modalities</div>
                  <div className="flex flex-wrap gap-2">
                    {model.outputModalities.map((modality) => (
                      <Badge key={modality} variant="outline" className="rounded-full">
                        {formatDisplayToken(modality)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 xl:col-span-1">
              <CardHeader>
                <CardTitle>Embedding Collections</CardTitle>
              </CardHeader>
              <CardContent>
                {model.embedderFor.length > 0 ? (
                  <div className="space-y-2">
                    {model.embedderFor.map((embedder) => (
                      <AlpakaCollection.DetailLink
                        key={embedder.id}
                        object={embedder}
                        className="block rounded-xl border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      >
                        {embedder.name}
                      </AlpakaCollection.DetailLink>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    This model is not currently assigned as an embedder for any collection.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AlpakaLLMModel.ModelPage>
    );
  },
);


export default TPage
