import React from "react";
import { Identifier } from "@/core/types";
import { PageLayout } from "./PageLayout";
import { CommandContext } from "@/core/command/CommandContext";
import { ModuleHomeHeader } from "./ModuleHome";
import { useListPageHead } from "@/core/modules/hooks/listPageHead";

export type ListPageLayoutProps = {
  children: React.ReactNode;
  identifier: Identifier;
  title?: React.ReactNode;
  /**
   * The header's line, for a page narrower than the model (one spec of a
   * dataset). Defaults to the model's manifest `description`.
   */
  description?: React.ReactNode;
  /** `false` leaves the header out, for a page that draws a head of its own. */
  header?: boolean;
  help?: React.ReactNode;
  sidebars?: React.ReactNode;
  actions?: React.ReactNode;
  pageActions?: React.ReactNode;
  callback?: (object: string) => void;
};

/**
 * The head every model's list page opens with, drawn like the module's home:
 * icon tile, title, one sentence on what the list holds (`listPageHead`).
 * Nothing for a model that declares no description.
 */
const ListPageHeader = ({
  identifier,
  title,
  description,
}: {
  identifier: Identifier;
  title?: React.ReactNode;
  description?: React.ReactNode;
}) => {
  const head = useListPageHead(identifier);
  if (!head) return null;
  const Icon = head.icon;
  return (
    // Aligned with the list below it, which pads itself like the home does.
    <div className="px-3 pt-3">
      <ModuleHomeHeader
        moduleKey={head.namespace}
        icon={Icon ? <Icon /> : undefined}
        title={title ?? head.label}
        description={description ?? head.description}
      />
    </div>
  );
};

export const ListPageLayout = ({
  sidebars,
  help,
  title,
  description,
  header = true,
  children,
  identifier,
  actions,
  pageActions,
}: ListPageLayoutProps) => {
  // Memoised because the palette registers on the array's identity: a fresh
  // `[identifier]` literal per render would re-register on every render.
  const returnsForCommand = React.useMemo(() => [identifier], [identifier]);

  return (
    <div className="h-full w-full">
      <PageLayout
        title={title}
        sidebars={sidebars}
        help={help}
        actions={actions}
        pageActions={pageActions}
      >
        <CommandContext returns={returnsForCommand} />
        {header && <ListPageHeader identifier={identifier} title={title} description={description} />}
        {children}
      </PageLayout>
    </div>
  );
};
