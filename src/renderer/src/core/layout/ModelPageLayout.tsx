import { CommandContext } from "@/core/command/CommandContext";
import { ObjectButton } from "@/core/smart/ObjectButton";
import { structure } from "@/core/smart/structure";
import { Identifier, Object } from "@/core/types";
import {
  cloneElement,
  isValidElement,
  useMemo,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { flattenChildren, Sidebars } from "./Sidebars";
import { PageLayout, PageVariant } from "./PageLayout";
import { SlotSections } from "./PageSections";
import { smartRegistry } from "@/core/smart/registry";

/** Label of the rail tab holding this structure's conversations. */
const CHAT_TAB_LABEL = "Chat";

/**
 * Label of the rail tab holding everything kraph records about this structure —
 * the claims made about it AND the discussion. One tab, because a comment is a
 * claim in the same evidence log; two tabs asked the reader to know which kind
 * of remark they were about to make before they made it.
 */
const KNOWLEDGE_TAB_LABEL = "Knowledge";

/** A `<Sidebars.Tab label="Knowledge">` slot, wherever a page put it. */
const isKnowledgeTab = (child: ReactNode) =>
  isValidElement(child) &&
  child.type === Sidebars.Tab &&
  (child.props as { label?: string }).label === KNOWLEDGE_TAB_LABEL;

/**
 * Most model pages hand in their own rail instead of using the default below,
 * and every model page should be able to talk about what it is showing — so
 * the Chat tab is folded into whatever the page passed:
 *
 * - a `<Sidebars>` rail gets the tab appended (`collectTabs` dedups by label,
 *   so a rail already spelling out its own "Chat" keeps winning);
 * - a bare component as the rail (a handful of pages pass just their
 *   `Knowledge`) is promoted to a two-tab rail, since a tabless rail has
 *   nowhere for the chat to go.
 *
 * Knowledge is a datum's affair (see `SmartConfig.datum`). `X.Knowledge`
 * already renders nothing for a non-datum, but a page that hand-placed it in
 * a Knowledge tab would still show that tab, empty — so for a non-datum the
 * tab is dropped here, and a bare rail gets no Knowledge slot at all.
 */
const withChatTab = (
  rail: ReactNode,
  chatTab: ReactNode,
  sidebarKey: string,
  datum: boolean,
): ReactNode => {
  if (isValidElement(rail) && rail.type === Sidebars) {
    const element = rail as ReactElement<ComponentProps<typeof Sidebars>>;
    const tabs = datum
      ? element.props.children
      : flattenChildren(element.props.children).filter(
          (child) => !isKnowledgeTab(child),
        );
    return cloneElement(
      element,
      {},
      <>
        {tabs}
        {chatTab}
      </>,
    );
  }

  return (
    <Sidebars sidebarKey={sidebarKey}>
      {datum && <Sidebars.Tab label={KNOWLEDGE_TAB_LABEL}>{rail}</Sidebars.Tab>}
      {chatTab}
    </Sidebars>
  );
};

export type ModelPageLayoutProps = {
  children: React.ReactNode;
  identifier: Identifier;
  object: Object;
  title?: React.ReactNode;
  sidebars?: React.ReactNode;
  /**
   * Extra `<Sidebars.Tab>` elements appended after the default tabs. A tab
   * whose label matches a default replaces that default's content in place.
   */
  additionalSidebars?: React.ReactNode;
  actions?: React.ReactNode;
  pageActions?: React.ReactNode;
  variant?: PageVariant;
  /** Seamless sidebar rail — see PageLayout's `overlay` prop. */
  overlay?: boolean;
  /** The rail tab to open when nothing valid is remembered. */
  defaultSidebar?: string;
  /**
   * localStorage key for the remembered rail tab. Defaults to the key shared
   * by all model pages; pages with their own tab set (the scene pages and
   * their Layers tab) pass their own so their preference doesn't fight the
   * rest of the app's.
   */
  sidebarKey?: string;
  /**
   * Whether to fold the Chat tab into the rail (default true). A room page IS
   * the conversation, so it opts out rather than offering a chat about a chat.
   */
  chat?: boolean;
  callback?: (object: Object) => void;
};

export const ModelPageLayout = ({
  sidebars,
  additionalSidebars,
  title,
  children,
  identifier,
  object,
  variant,
  overlay,
  defaultSidebar,
  sidebarKey,
  actions,
  pageActions,
  chat = true,
}: ModelPageLayoutProps) => {
  const label = typeof object.label === "string" ? object.label : typeof object.name === "string" ? object.name : undefined;
  const objects = useMemo(
    () => [structure(identifier, object.id, { label })],
    [identifier, object.id, label],
  );
  const datum = smartRegistry.isDatum(identifier);
  // The two host-drawn sidebars, filled by whichever modules contribute to
  // their slot (kraph: knowledge, alpaka: chat), each behind its own guard.
  const knowledgeSidebar = (
    <SlotSections slot="knowledge" identifier={identifier} object={object} />
  );

  const chatTab = (
    <Sidebars.Tab label={CHAT_TAB_LABEL} key={CHAT_TAB_LABEL}>
      <SlotSections slot="chat" identifier={identifier} object={object} />
    </Sidebars.Tab>
  );

  return (
    <PageLayout
      title={title}
      sidebars={sidebars ? withChatTab(sidebars, chat ? chatTab : null, sidebarKey ?? "DetailModel", datum) : (
        <Sidebars
          sidebarKey={sidebarKey ?? "DetailModel"}
          defaultTab={defaultSidebar}
          variant={overlay ? "overlay" : "default"}
        >
          {datum && (
            <Sidebars.Tab label={KNOWLEDGE_TAB_LABEL}>{knowledgeSidebar}</Sidebars.Tab>
          )}
          {additionalSidebars}
          {chat && chatTab}
        </Sidebars>
      )}
      variant={variant}
      overlay={overlay}
      actions={actions}
      // The menu is the page's way into everything a model can do, so
      // it is pinned: it stays in the row however tight the row gets.
      pageActions={pageActions || <ObjectButton alwaysShow objects={objects} />}
    >
      <CommandContext objects={objects} />
      {children}
    </PageLayout>
  );
};
