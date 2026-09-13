import { Object, Identifier } from "@/types";
import React from "react";

export type SmartObjectContext<T extends Object = Object> = {
  identifier: Identifier;
  object: T;
};

export type SmartModelPage<T extends Object = Object> = {
  children?: React.ReactNode;
  object: T;
  title?: React.ReactNode;
  sidebars?: React.ReactNode;
  /** Extra `<Sidebars.Tab>` elements appended after the default rail tabs. */
  additionalSidebars?: React.ReactNode;
  actions?: React.ReactNode;
  pageActions?: React.ReactNode;
  variant?: unknown;
  /** Seamless sidebar rail — see PageLayout's `overlay` prop. */
  overlay?: boolean;
  /** The rail tab to open when nothing valid is remembered. */
  defaultSidebar?: string;
  /** Own persistence key for the remembered rail tab (default "DetailModel"). */
  sidebarKey?: string;
  callback?: (object: T) => void;
};

export type SmartListPageProps<T extends Object = Object> = {
  children?: React.ReactNode;
  title?: React.ReactNode;
  help?: React.ReactNode;
  sidebars?: React.ReactNode;
  pageActions?: React.ReactNode;
  variant?: unknown;
  callback?: (object: T) => void;
};

export type SmartObjectButtonProps<T extends Object = Object> = {
  object: T;
  children?: React.ReactNode;
  [key: string]: any;
};

export type SmartNewButtonProps = {
  children?: React.ReactNode;
  [key: string]: any;
};

export interface SmartBuilderAdapters {
  renderKnowledge: (context: SmartObjectContext) => React.ReactNode;
  renderTinyKnowledge: (context: SmartObjectContext) => React.ReactNode;
  renderHover: (context: SmartObjectContext) => React.ReactNode;
  renderModelPage: (
    props: SmartModelPage<any> & { identifier: Identifier },
  ) => React.ReactNode;
  renderListPage: (
    props: SmartListPageProps & { identifier: Identifier },
  ) => React.ReactNode;
  renderObjectButton: (
    props: SmartObjectButtonProps & { identifier: Identifier },
  ) => React.ReactNode;
  renderNewButton: (
    props: SmartNewButtonProps & { identifier: Identifier },
  ) => React.ReactNode;
}

let smartBuilderAdapters: SmartBuilderAdapters = {
  renderKnowledge: () => null,
  renderTinyKnowledge: () => <>Not implemented right now</>,
  renderHover: () => null,
  renderModelPage: ({ children }) => <>{children}</>,
  renderListPage: ({ children }) => <>{children}</>,
  renderObjectButton: () => null,
  renderNewButton: () => null,
};

export const configureSmartBuilder = (
  adapters: Partial<SmartBuilderAdapters>,
) => {
  smartBuilderAdapters = {
    ...smartBuilderAdapters,
    ...adapters,
  };
};

export const getSmartBuilderAdapters = () => smartBuilderAdapters;
