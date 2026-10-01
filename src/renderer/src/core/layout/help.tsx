import type { ReactNode } from "react";
import { Button } from "../ui/button"
import { ButtonGroup } from "../ui/button-group";
import { useReport } from "@/core/debug/use-report";
import { useOpenDocs } from "@/core/layout/use-open-docs";

export type PageHelpProps = {
  /** One or two sentences: what this page is and what it is for. */
  intro: ReactNode;
  /** Concrete things to do here, in the order a newcomer would try them. */
  steps?: ReactNode[];
  /** Side notes: shortcuts, gotchas, where a thing comes from. */
  tips?: ReactNode[];
};

/**
 * The one shape every page's help text takes, so the Help tab reads the same
 * across modules: what the page is, what to do on it, what is worth knowing.
 * The text itself lives with its module (`<module>/help.tsx`), and names only
 * buttons, menus and dialogs that page really has.
 */
export const PageHelp = ({ intro, steps, tips }: PageHelpProps) => {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed">
      <p>{intro}</p>
      {steps && steps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Things to do here
          </h3>
          <ol className="flex flex-col gap-2 list-decimal pl-5 marker:text-muted-foreground">
            {steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      )}
      {tips && tips.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Good to know
          </h3>
          <ul className="flex flex-col gap-2 list-disc pl-5 text-muted-foreground marker:text-muted-foreground">
            {tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export const HelpSidebar = (props: { help?: React.ReactNode }) => {

  const report = useReport();
  const openDocs = useOpenDocs();


  return (
    <div className="p-4 flex flex-col gap-4 h-full min-h-0">
      <h2 className="text-lg font-semibold flex-initial">Help & Documentation</h2>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {props.help || (
          <p className="text-sm text-muted-foreground">
            This page has no instructions of its own yet. The docs cover the
            application as a whole.
          </p>
        )}
      </div>

      <ButtonGroup orientation="horizontal" className="flex-initial w-full flex flex-row" >

        <Button variant="outline" onClick={openDocs} className="flex-1">
          Docs
        </Button>
        <Button variant="outline" onClick={report} className="flex-1">
          Report a Bug
        </Button>
      </ButtonGroup>
    </div>
  );
};
