import { ListPageLayout } from "@/core/components/layout/ListPageLayout";
import { ModelPageLayout } from "@/core/components/layout/ModelPageLayout";
import { PageVariant } from "@/core/components/layout/PageLayout";
import {
  configureSmartBuilder,
  SmartListPageProps,
  SmartModelPage,
  SmartNewButtonProps,
  SmartObjectButtonProps,
} from "@/core/providers/smart/buildSmartAdapters";
import { ObjectButton } from "@/core/providers/smart/extensions/context";
import { SlotSections } from "@/core/components/layout/PageSections";
import { MODULE_HOVERS } from "../core/modules/registries";

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
  // The host-drawn Knowledge surface, filled by whichever module contributes
  // to the "knowledge" slot (kraph), behind that module's guard.
  renderKnowledge: ({ identifier, object }) => (
    <SlotSections slot="knowledge" identifier={identifier} object={object} />
  ),
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
