import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { useDialog } from "@/core/dialogs/registry";
import { registry } from "@/core/smart/localactions/registry";
import { Sidebars } from "@/core/layout/Sidebars";
import { LocalActionButton } from "@/core/ui/localactionbutton";
import { RekuestAgent, RekuestBlok } from "@/core/linkers";
import { cn } from "@/core/util/utils";
import DemoBlokRenderer from "@/rekuest/components/DemoBlokRenderer";
import { ArgPortRows, SignatureColumn } from "@/rekuest/components/action/ActionSignature";
import { ComponentContext, useGetBlokQuery, useLogoBlokQuery, type GetBlokQuery } from "../api/graphql";
import { ErrorNote } from "@/core/ui/error-note";
import { InfoList } from "@/core/ui/info-list";
import { ErrorBoundary } from "react-error-boundary";
import MaterializedBlokCard from "../components/cards/MaterializedBlokCard";
import { BLOK_CONTEXTS, isLogoContext } from "../components/blokContexts";
import { BlokLogo } from "../components/logo/BlokLogo";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import { GitFork, Plus } from "lucide-react";
import { BlokHistory } from "../components/editor/BlokHistory";
import { REKUEST_HELP } from "../help";
import { useTabGlyph } from "@/core/tabs/useTabGlyph";

type DetailBlok = GetBlokQuery["blok"];

const STAGE = "overflow-hidden rounded-xl border border-border/60 bg-muted/20";

/** A logo is a drawing with no size of its own: shown large, centred, on its own. */
const LogoStage = ({ id }: { id: string }) => {
  const { data } = useLogoBlokQuery({ variables: { id } });
  const hash = data?.blok?.hash;
  return (
    <div className={cn(STAGE, "flex h-72 items-center justify-center")}>
      {hash && <BlokLogo blok={{ id, hash }} className="size-40" />}
    </div>
  );
};

/**
 * What the blok looks like: the blok itself, drawn with its demo values and
 * bound to no agent, taking most of the page. A scene can be turned and
 * framed; a panel is the panel, as wide as the page.
 */
const BlokStage = ({ blok }: { blok: DetailBlok }) => {
  if (isLogoContext(blok.context)) return <LogoStage id={blok.id} />;
  const scene = blok.context === ComponentContext.Scene;
  return (
    <figure className="flex flex-col gap-1.5">
      <div className={cn(STAGE, "h-[min(72vh,52rem)] min-h-80")}>
        <ErrorBoundary
          resetKeys={[blok.componentTree]}
          fallbackRender={({ error }) => <ErrorNote error={error} title="The preview could not draw this blok" />}
        >
          <DemoBlokRenderer surfaceId={`${blok.id}-page`} blok={blok} sceneControls={scene} />
        </ErrorBoundary>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        A template, shown with its demo values and running on no agent. Install it to make a blok that runs on yours.
      </figcaption>
    </figure>
  );
};

/**
 * A blok template: what a blok is made of. People mostly meet the bloks made
 * from it (installed, running on agents); this page shows the template
 * itself, the bloks made from it, and installs another.
 */
export const BlokPage = asDetailQueryRoute(useGetBlokQuery, ({ data }) => {
  const { openDialog } = useDialog();
  // An app's agents keep a provided template in step with their registrations:
  // it is forked, never edited, installed or deleted by hand.
  const blok = data.blok;
  const provided = blok.provided;
  const context = BLOK_CONTEXTS[blok.context];
  // Its own <logo>, in the tab strip.
  useTabGlyph(blok.hasLogo ? { identifier: "@rekuest/blok", id: blok.id } : null);

  return (
    <RekuestBlok.ModelPage
      title={blok.name || "New Blok"}
      help={REKUEST_HELP.blok}
      object={data.blok}
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                ["Kind", context?.label],
                [
                  "Module",
                  <span>
                    {blok.module.name}
                    {!blok.module.isRegistered && <span className="text-warning"> · not registered</span>}
                  </span>,
                ],
                ["Revision", blok.head && <span className="tabular-nums">#{blok.head.number}</span>],
                [
                  "Agents",
                  blok.dependencies.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {blok.dependencies.map((dependency) => (
                        <li key={dependency.id} className="flex flex-col">
                          <span className="font-mono text-xs">{dependency.key}</span>
                          {dependency.description && (
                            <span className="text-xs text-muted-foreground">{dependency.description}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ),
                ],
                ["Provided by", provided && <span className="font-mono text-xs">{blok.app?.identifier}</span>],
                [
                  "Its agents",
                  provided && blok.providers.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {blok.providers.map((agent) => (
                        <li key={agent.id} className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              agent.connected ? "bg-success" : "bg-muted-foreground/40",
                            )}
                            title={agent.connected ? "Connected" : "Offline"}
                          />
                          <RekuestAgent.DetailLink object={agent} className="truncate hover:underline">
                            {agent.name || agent.id}
                          </RekuestAgent.DetailLink>
                        </li>
                      ))}
                    </ul>
                  ),
                ],
                ["Installed from", blok.origin && <span className="break-all font-mono text-xs">{blok.origin}</span>],
              ]}
            />
          </Sidebars.Tab>
          {!provided && (
            <Sidebars.Tab label="History">
              <BlokHistory blokId={blok.id} />
            </Sidebars.Tab>
          )}
        </>
      }
      pageActions={provided ? (
        <>
        <LocalActionButton
            name={"rekuest-export-blok" as keyof typeof registry}
            state={{ left: [{ identifier: '@rekuest/blok', id: blok.id }], isCommand: false }}
        />
        <PageAction.Slot alwaysShow>
          <Button
            variant="default"
            onClick={() => openDialog("forkblok", { id: blok.id, name: blok.name })}
          >
            <GitFork className="h-4 w-4" />
            Fork Template
          </Button>
        </PageAction.Slot>
        </>
      ) : (
        <>
            <LocalActionButton
                name={"rekuest-export-blok" as keyof typeof registry}
                state={{ left: [{ identifier: '@rekuest/blok', id: blok.id }], isCommand: false }}
            />
            <LocalActionButton
                name={"rekuest-edit-blok" as keyof typeof registry}
                state={{
                  left: [
                    {
                      identifier: '@rekuest/blok',
                      id: blok.id,
                    },
                  ],
                  isCommand: false,
                }}
            />
            <LocalActionButton
                priority={-20}
                name={"rekuest-delete-blok" as keyof typeof registry}
                state={{
                  left: [
                    {
                      identifier: '@rekuest/blok',
                      id: blok.id,
                    },
                  ],
                  isCommand: false,
                }}
            />

            <PageAction.Slot alwaysShow>
              <Button variant="default" onClick={() => openDialog("materializeblok", { id: blok.id })}>
                <Plus className="h-4 w-4" />
                Install
              </Button>
            </PageAction.Slot>
        </>
      )}
    >
      <div className="flex w-full flex-col gap-6 p-3">
        {(context || blok.description) && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {context && (
              <span className="flex items-center gap-1.5 text-foreground">
                <context.icon className="size-3.5" />
                {context.label} template
              </span>
            )}
            {context && blok.description && <span>·</span>}
            {blok.description}
          </p>
        )}

        {blok.diagnostics.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            {blok.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} className="flex flex-wrap items-baseline gap-x-2">
                <span>{diagnostic.message}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {diagnostic.code}
                  {diagnostic.path ? ` @ ${diagnostic.path}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* The page is about this: the blok itself, as large as the page allows. */}
        <BlokStage blok={blok} />

        {blok.args.length > 0 && (
          <section className="flex flex-col gap-2">
            <SignatureColumn title="Opened for">
              <ArgPortRows ports={blok.args} />
            </SignatureColumn>
            <p className="text-xs text-muted-foreground">
              Offered under "Tailored Interfaces" on what these take, and read at{" "}
              <span className="font-mono">args.&lt;key&gt;</span>.
            </p>
          </section>
        )}

        {blok.materializedBloks.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Bloks made from it
              <span className="ml-1.5 font-normal tabular-nums text-muted-foreground/60">
                {blok.materializedBloks.length}
              </span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3">
              {blok.materializedBloks.map((materialized) => (
                <MaterializedBlokCard key={materialized.id} item={materialized} />
              ))}
            </div>
          </section>
        )}
      </div>
    </RekuestBlok.ModelPage>
  );
});


export default BlokPage;
