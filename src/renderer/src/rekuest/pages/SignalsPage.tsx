import { PageLayout } from "@/core/layout/PageLayout";
import { Sidebars } from "@/core/layout/Sidebars";
import SignalList from "../components/lists/SignalList";
import { SignalDeclarationsSidebar } from "../sidebars/SignalDeclarationsSidebar";

/**
 * What services announced about the organization's objects, newest first:
 * the feed triggers match against. Inspection only; triggers are made from
 * a signal (hover) or from what services declare (the sidebar).
 */
const Page = () => (
  <PageLayout
    title="Signals"
    sidebars={
      <Sidebars>
        <Sidebars.Tab label="Declared">
          <SignalDeclarationsSidebar />
        </Sidebars.Tab>
      </Sidebars>
    }
  >
    <div className="p-6">
      <div className="mb-6 max-w-3xl">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
          Signals
        </h1>
        <p className="mt-2 text-muted-foreground">
          Objects services reported as created, updated or deleted, and the runs they fired.
        </p>
      </div>
      <SignalList />
    </div>
  </PageLayout>
);

export default Page;
