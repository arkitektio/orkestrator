import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Sidebars } from "@/core/layout/Sidebars";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AlpakaLLMModel, AlpakaProvider } from "@/core/linkers";
import { useEffect, useMemo, useState } from "react";
import {
  useGetProviderQuery
} from "../api/graphql";
import {
  getProviderKindDisplayName,
  ProviderKindIcon,
} from "../components/cards/ProviderCard";

const MODELS_PER_PAGE = 8;

export const TPage = asDetailQueryRoute(
  useGetProviderQuery,
  ({ data, subscribeToMore: _subscribeToMore }) => {
    const provider = data.provider;
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(provider.models.length / MODELS_PER_PAGE));
    const currentPage = Math.min(page, pageCount - 1);
    const visibleModels = useMemo(() => {
      const offset = currentPage * MODELS_PER_PAGE;
      return provider.models.slice(offset, offset + MODELS_PER_PAGE);
    }, [currentPage, provider.models]);

    useEffect(() => {
      if (page !== currentPage) {
        setPage(currentPage);
      }
    }, [currentPage, page]);

    return (
      <AlpakaProvider.ModelPage
        title={provider.name}
        object={provider}
        pageActions={
          <>
            <AlpakaProvider.ObjectButton alwaysShow object={provider} />
          </>
        }
        sidebars={
          <Sidebars>
            <Sidebars.Tab label="Knowledge">
              <AlpakaProvider.Knowledge object={provider} />
            </Sidebars.Tab>
          </Sidebars>
        }
      >
        <div className="space-y-6">
          <Card className="overflow-hidden border-border/60 bg-card">
            <CardContent className="flex flex-col gap-6 pt-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-muted/60">
                  <ProviderKindIcon kind={provider.kind} className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline" className="rounded-full">
                    {getProviderKindDisplayName(provider.kind)}
                  </Badge>
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">{provider.name}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Alpaka provider backing {provider.models.length} {provider.models.length === 1 ? "model" : "models"}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 md:grid-cols-1">
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Models</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{provider.models.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Provider ID</div>
                  <div className="mt-1 truncate text-sm text-foreground/85">{provider.id}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Available Models</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {provider.models.length > 0 ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                    {visibleModels.map((model) => (
                      <AlpakaLLMModel.DetailLink
                        key={model.id}
                        object={model}
                        className="block rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                      >
                        <div className="text-sm font-medium text-foreground">{model.modelId}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Open model details
                        </div>
                      </AlpakaLLMModel.DetailLink>
                    ))}
                    </div>

                    {pageCount > 1 ? (
                      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <div className="text-sm text-muted-foreground">
                          Page {currentPage + 1} of {pageCount}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((previous) => Math.max(0, previous - 1))}
                            disabled={currentPage === 0}
                          >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((previous) => Math.min(pageCount - 1, previous + 1))}
                            disabled={currentPage >= pageCount - 1}
                          >
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    This provider does not expose any models yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Kind</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {getProviderKindDisplayName(provider.kind)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Model Density</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {provider.models.length > 0
                      ? `${provider.models.length} connected ${provider.models.length === 1 ? "model" : "models"}`
                      : "No connected models"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Provider Record</div>
                  <div className="mt-1 break-all text-sm text-muted-foreground">{provider.id}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AlpakaProvider.ModelPage>
    );
  },
);


export default TPage;
