import React from "react";
import { Identifier } from "@/types";
import { PageLayout, PageVariant } from "./PageLayout";
import { CommandContext } from "@/command/CommandContext";

export type ListPageLayoutProps = {
  children: React.ReactNode;
  identifier: Identifier;
  title?: React.ReactNode;
  help?: React.ReactNode;
  sidebars?: React.ReactNode;
  actions?: React.ReactNode;
  pageActions?: React.ReactNode;
  variant?: PageVariant;
  callback?: (object: string) => void;
};

export const ListPageLayout = ({
  sidebars,
  help,
  title,
  children,
  identifier,
  variant,
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
        variant={variant}
        actions={actions}
        pageActions={pageActions}
      >
        <CommandContext returns={returnsForCommand} />
        {children}
      </PageLayout>
    </div>
  );
};
