import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { KabinetDefinition } from "@/core/linkers";
import { ArgPortFragment, ReturnPortFragment, useGetDefinitionQuery } from "../api/graphql";
import FlavourCard from "../components/cards/FlavourCard";
import { CardGrid, DetailSection } from "../components/DetailSection";
import { DefinitionLogo } from "../components/logo/KabinetBlokLogo";
import { KABINET_HELP } from "../help";

/** A port as one line: its name, what it carries, and what it is for. */
const PortRow = ({ port }: { port: ArgPortFragment | ReturnPortFragment }) => (
  <li className="flex min-w-0 flex-col gap-0.5 py-2">
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="truncate text-sm font-medium">{port.label || port.key}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {port.identifier ?? port.kind.toLowerCase()}
        {port.nullable && "?"}
      </span>
    </div>
    {port.description && (
      <p className="line-clamp-2 text-xs text-muted-foreground">{port.description}</p>
    )}
  </li>
);

const PortList = ({ ports }: { ports: readonly (ArgPortFragment | ReturnPortFragment)[] }) => (
  <ul className="divide-y">
    {ports.map((port) => (
      <PortRow key={port.key} port={port} />
    ))}
  </ul>
);

/**
 * A definition: an action as the releases declare it, before any agent runs
 * it. The page says what it does, what it takes and returns, and which
 * builds bring it; its hash is the Info rail's.
 */
export const DefinitionPage = asDetailQueryRoute(useGetDefinitionQuery, ({ data }) => {
  const definition = data.definition;

  return (
    <KabinetDefinition.ModelPage
      title={definition.name}
      object={definition}
      help={KABINET_HELP.definition}
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <InfoList
              rows={[
                [
                  "Hash",
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="truncate font-mono text-xs" title={definition.hash}>
                      {definition.hash}
                    </span>
                    <CopyButton value={definition.hash} title="Copy hash" />
                  </span>,
                ],
                ["Takes", definition.args.length],
                ["Returns", definition.returns.length],
                ["Flavours", definition.flavours.length],
              ]}
            />
          </Sidebars.Tab>
          <Sidebars.Tab label="Knowledge">
            <KabinetDefinition.Knowledge object={definition} />
          </Sidebars.Tab>
        </>
      }
      defaultSidebar="Info"
    >
      <div className="flex flex-col gap-6 p-3">
        <header className="flex items-start gap-3">
          <DefinitionLogo definition={definition} className="size-10 shrink-0 rounded-lg" />
          {definition.description && (
            <p className="max-w-prose text-sm text-muted-foreground">{definition.description}</p>
          )}
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <DetailSection title="Takes" count={definition.args.length}>
            <PortList ports={definition.args} />
          </DetailSection>
          <DetailSection title="Returns" count={definition.returns.length}>
            <PortList ports={definition.returns} />
          </DetailSection>
        </div>

        <DetailSection title="Flavours" count={definition.flavours.length}>
          <CardGrid>
            {definition.flavours.map((flavour) => (
              <FlavourCard key={flavour.id} item={flavour} />
            ))}
          </CardGrid>
        </DetailSection>
      </div>
    </KabinetDefinition.ModelPage>
  );
});

export default DefinitionPage;
