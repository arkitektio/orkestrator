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
import { KnowledgeSidebar } from "@/kraph/components/sidebars/KnowledgeSidebar";
import { MODULE_HOVERS } from "./modules/registries";

// Hover cards are each module's `hovers` builtin, paired with its module guard
// (app/modules/registries). They run module-specific GraphQL, so the guard wraps
// the component from the outside: its query hooks only mount once the backend
// is `ready`, and nothing fires when the module is absent.

// `SmartModelPage`/`SmartListPageProps` type `variant` as `unknown` since the
// smart-adapter layer is generic over any page layout; narrow it down to the
// concrete `PageVariant` union that the shadcn layouts actually accept.
const asPageVariant = (variant: unknown): PageVariant | undefined =>
  variant === "black" || variant === "default" ? variant : undefined;


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
    const entry = MODULE_HOVERS[identifier];
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
    return <ObjectButton objects={[{ identifier, id: object.id }]} {...props} />;
  },
  renderNewButton: ({ identifier, ...props }: SmartNewButtonProps & { identifier: string }) => {
    return <ObjectButton returns={[identifier]} objects={[]} {...props} />;
  },
});
