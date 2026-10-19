import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { useDialog } from "@/core/dialogs/registry";
import { registry } from "@/core/smart/localactions/registry";
import { LocalActionButton } from "@/core/ui/localactionbutton";
import { RekuestAgent, RekuestBlok, RekuestMaterializedBlok } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import DemoBlokRenderer from "@/rekuest/components/DemoBlokRenderer";
import { useGetBlokQuery } from "../api/graphql";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/core/ui/dialog";
import { MaterializeBlokForm } from "../forms/MaterializeBlokForm";
import { GitFork } from "lucide-react";
import { useState } from "react";
import { REKUEST_HELP } from "../help";

export const BlokPage = asDetailQueryRoute(useGetBlokQuery, ({ data }) => {
  const [open, setOpen] = useState(false);
  const { openDialog } = useDialog();
  // An app's agents keep a provided blok in step with their registrations:
  // it is forked, never edited, materialized or deleted by hand.
  const provided = data.blok.provided;

  return (
    <RekuestBlok.ModelPage
      title={data.blok.name || "New Blok"}
      help={REKUEST_HELP.blok}
      object={data.blok}
      pageActions={provided ? (
        <PageAction.Slot alwaysShow>
          <Button
            variant="default"
            onClick={() => openDialog("forkblok", { id: data.blok.id, name: data.blok.name })}
          >
            <GitFork className="h-4 w-4" />
            Fork Blok
          </Button>
        </PageAction.Slot>
      ) : (
        <>
            <LocalActionButton
                priority={-20}
                name={"rekuest-delete-blok" as keyof typeof registry}
                state={{
                  left: [
                    {
                      identifier: '@rekuest/blok',
                      id: data.blok.id,
                    },
                  ],
                  isCommand: false,
                }}
            />

            <PageAction.Slot alwaysShow>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="default">Materialize Blok</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Materialize Blok</DialogTitle>
                    </DialogHeader>
                    {data.blok.dependencies && (
                        <MaterializeBlokForm
                            blokId={data.blok.id}
                            dependencies={data.blok.dependencies.map((dependency) => ({
                              id: dependency.id,
                              key: dependency.key,
                              description: dependency.description,
                            }))}
                          onMaterialized={(_materializedBlok) => {
                                setOpen(false);
                                // navigate to the materialized dashboard/blok here if applicable
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
            </PageAction.Slot>
        </>
      )}
    >
      <div className="relative flex h-full w-full flex-col gap-4 p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-muted/25 p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Blok State
              </h2>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{data.blok.name}</p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Catalog
                </p>
                <p className="mt-1 text-sm font-medium">
                  {data.blok.catalog.name}
                  {!data.blok.catalog.isRegistered && (
                    <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-muted-foreground">
                      not registered
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Dependencies
                </p>
                <p className="mt-1 text-sm font-medium">{data.blok.dependencies.length}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Materializations
                </p>
                <p className="mt-1 text-sm font-medium">{data.blok.materializedBloks.length}</p>
              </div>
            </div>

            {provided && (
              <div className="grid gap-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Provided by
                  </p>
                  <p className="mt-1 text-sm font-medium">{data.blok.app?.identifier}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    It follows its agents' registrations. Fork it to change it.
                  </p>
                </div>
                {data.blok.providers.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        agent.connected ? "bg-emerald-500" : "bg-muted-foreground/40",
                      )}
                      title={agent.connected ? "Connected" : "Offline"}
                    />
                    <RekuestAgent.DetailLink object={agent} className="truncate">
                      {agent.name || agent.id}
                    </RekuestAgent.DetailLink>
                  </div>
                ))}
              </div>
            )}

            {data.blok.diagnostics.length > 0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Diagnostics
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {data.blok.diagnostics.map((diagnostic, index) => (
                    <li key={`${diagnostic.code}-${index}`}>
                      <span className="font-mono text-xs text-muted-foreground">
                        {diagnostic.code}
                        {diagnostic.path ? ` @ ${diagnostic.path}` : ""}
                      </span>
                      <span className="ml-2">{diagnostic.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
              The preview is built from the blok component tree and seeded with the demo state through the blok renderer.
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-background/70 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Materialized Blok Index</h2>
                <p className="text-sm text-muted-foreground">
                  All materialized instances for this blok, ready to open.
                </p>
              </div>
              <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                {data.blok.materializedBloks.length}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {data.blok.materializedBloks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  No materialized bloks yet.
                </div>
              ) : (
                data.blok.materializedBloks.map((materializedBlok) => (
                  <div
                    key={materializedBlok.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4 transition-colors hover:border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Materialized Blok
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-foreground">
                          <RekuestMaterializedBlok.DetailLink object={materializedBlok}>
                            {materializedBlok.id}
                          </RekuestMaterializedBlok.DetailLink>
                        </p>
                      </div>
                      <div className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                        {materializedBlok.blok.name}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/35 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Preview Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Expanded preview area for inspecting the blok layout below the state summary.
              </p>
            </div>
            <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              {data.blok.id}
            </div>
          </div>

          <div className="min-h-[36rem] overflow-hidden">
            <DemoBlokRenderer
              surfaceId={`${data.blok.id}-expanded`}
              blok={data.blok}
              debug
            />
          </div>
        </section>
      </div>
    </RekuestBlok.ModelPage>
  );
});


export default BlokPage;
