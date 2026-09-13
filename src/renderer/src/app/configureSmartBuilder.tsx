import { Guard } from "@/app/Arkitekt";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ModelPageLayout } from "@/components/layout/ModelPageLayout";
import { PageVariant } from "@/components/layout/PageLayout";
import {
  configureSmartBuilder,
  SmartListPageProps,
  SmartModelPage,
  SmartNewButtonProps,
  SmartObjectButtonProps,
} from "@/providers/smart/buildSmartAdapters";
import { ObjectButton } from "@/providers/smart/extensions/context";
import { ComponentType, ReactNode } from "react";
import { KnowledgeSidebar } from "@/kraph/components/sidebars/KnowledgeSidebar";
import ArrayDatasetHoverCard from "@/mikro-next/components/hovers/ArrayDatasetHoverCard";
import FileHoverCard from "@/mikro-next/components/hovers/FileHoverCard";
import FolderHoverCard from "@/mikro-next/components/hovers/FolderHoverCard";
import ActionHoverCard from "@/rekuest/components/hovers/ActionHoverCard";
import AgentHoverCard from "@/rekuest/components/hovers/AgentHoverCard";
import TaskHoverCard from "@/rekuest/components/hovers/TaskHoverCard";
import ImplementationHoverCard from "@/rekuest/components/hovers/ImplementationHoverCard";
import NeuronModelHoverCard from "@/elektro/components/hovers/NeuronModelHoverCard";
import SimulationHoverCard from "@/elektro/components/hovers/SimulationHoverCard";
import ExperimentHoverCard from "@/elektro/components/hovers/ExperimentHoverCard";

// Maps a smart model identifier to the component rendered inside its on-demand
// hover card, together with the module guard that gates it. The hover cards run
// module-specific GraphQL (e.g. the mikro / rekuest backends), so the guard must
// wrap the component from the outside — that way its query hooks only mount once
// the relevant backend is `ready`, and nothing fires when the module is absent.
type HoverCardEntry = {
  Component: ComponentType<{ object: any }>;
  Guard: ComponentType<{ children: ReactNode }>;
};

// `SmartModelPage`/`SmartListPageProps` type `variant` as `unknown` since the
// smart-adapter layer is generic over any page layout; narrow it down to the
// concrete `PageVariant` union that the shadcn layouts actually accept.
const asPageVariant = (variant: unknown): PageVariant | undefined =>
  variant === "black" || variant === "default" ? variant : undefined;

const hoverCards: Record<string, HoverCardEntry> = {
  "@mikro/file": { Component: FileHoverCard, Guard: Guard.Mikro },
  "@mikro/folder": { Component: FolderHoverCard, Guard: Guard.Mikro },
  "@mikro/arraydataset": {
    Component: ArrayDatasetHoverCard,
    Guard: Guard.Mikro,
  },
  "@rekuest/action": { Component: ActionHoverCard, Guard: Guard.Rekuest },
  "@rekuest/agent": { Component: AgentHoverCard, Guard: Guard.Rekuest },
  "@rekuest/task": {
    Component: TaskHoverCard,
    Guard: Guard.Rekuest,
  },
  "@rekuest/implementation": {
    Component: ImplementationHoverCard,
    Guard: Guard.Rekuest,
  },
  "@elektro/neuronmodel": {
    Component: NeuronModelHoverCard,
    Guard: Guard.Elektro,
  },
  "@elektro/simulation": {
    Component: SimulationHoverCard,
    Guard: Guard.Elektro,
  },
  "@elektro/experiment": {
    Component: ExperimentHoverCard,
    Guard: Guard.Elektro,
  },
};

configureSmartBuilder({
  renderKnowledge: ({ identifier, object }) => {
    // Claims and comments both live in kraph, so this whole surface is
    // module-specific: the guard has to sit outside, since the queries fire on
    // mount.
    return (
      <Guard.Kraph>
        <KnowledgeSidebar identifier={identifier} object={object} />
      </Guard.Kraph>
    );
  },
  renderHover: ({ identifier, object }) => {
    const entry = hoverCards[identifier];
    if (!entry) {
      return null;
    }
    const { Component, Guard: ModuleGuard } = entry;
    return (
      <ModuleGuard>
        <Component object={object} />
      </ModuleGuard>
    );
  },
  renderModelPage: ({ identifier, children, ...props }: SmartModelPage & { identifier: string }) => {
    // No Rooms injection here: the tab is gone from ModelPageLayout's defaults
    // too. Conversations start from the "Talk" button in the page header, which
    // is where they were actually being started from.
    return (
      <ModelPageLayout
        identifier={identifier}
        {...props}
        variant={asPageVariant(props.variant)}
      >
        {children}
      </ModelPageLayout>
    );
  },
  renderListPage: ({ identifier, children, callback, ...props }: SmartListPageProps & { identifier: string }) => {
    // `SmartListPageProps.callback` is generic over the smart object type
    // (`Object` by default), while `ListPageLayoutProps.callback` narrows it
    // to the selected item's string id — and the layout never actually
    // invokes it, so this is a type-only adaptation.
    const listCallback = callback as ((object: string) => void) | undefined;
    return (
      <ListPageLayout
        identifier={identifier}
        {...props}
        variant={asPageVariant(props.variant)}
        callback={listCallback}
      >
        {children}
      </ListPageLayout>
    );
  },
  renderObjectButton: ({ identifier, object, ...props }: SmartObjectButtonProps & { identifier: string }) => {
    return <ObjectButton objects={[{ identifier, object }]} {...props} />;
  },
  renderNewButton: ({ identifier, ...props }: SmartNewButtonProps & { identifier: string }) => {
    return <ObjectButton returns={[identifier]} objects={[]} {...props} />;
  },
});
