import React from "react";
import { Identifier } from "@/types";
import { PageLayout, PageVariant } from "./PageLayout";
import { CommandContext } from "@/command/CommandContext";
import { Sidebars } from "./Sidebars";
import { HelpSidebar } from "../sidebars/help";

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
  title,
  children,
  identifier,
  variant,
  pageActions,
}: ListPageLayoutProps) => {
  // Memoised because the palette registers on the array's identity: a fresh
  // `[identifier]` literal per render would re-register on every render.
  const returnsForCommand = React.useMemo(() => [identifier], [identifier]);

  return (
    <div className="h-full w-full">
      <PageLayout
        title={title}
        sidebars={sidebars || (
          <Sidebars>
            <Sidebars.Tab label="Help"><HelpSidebar /></Sidebars.Tab>
          </Sidebars>
        )}

        variant={variant}
        pageActions={pageActions}
      >
        <CommandContext returns={returnsForCommand} />
        {children}
      </PageLayout>
    </div>
  );
};
