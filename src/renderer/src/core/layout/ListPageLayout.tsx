import React from "react";
import { Identifier } from "@/core/types";
import { PageLayout } from "./PageLayout";
import { CommandContext } from "@/core/command/CommandContext";

export type ListPageLayoutProps = {
  children: React.ReactNode;
  identifier: Identifier;
  title?: React.ReactNode;
  help?: React.ReactNode;
  sidebars?: React.ReactNode;
  actions?: React.ReactNode;
  pageActions?: React.ReactNode;
  callback?: (object: string) => void;
};

export const ListPageLayout = ({
  sidebars,
  help,
  title,
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
        {children}
      </PageLayout>
    </div>
  );
};
