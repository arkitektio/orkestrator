import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { FlussPythonFlow } from "@/core/linkers";
import { usePythonFlowQuery } from "@/fluss/api/graphql";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { Unplug } from "lucide-react";
import { FLUSS_HELP } from "../help";
import { PythonFlowWorkbench } from "../python/PythonFlowWorkbench";
import { RunPythonFlowButton } from "../python/RunPythonFlowButton";

/** Checking a source and finding its actions both ask rekuest. */
export const NeedsRekuest = () => (
  <StatusPage
    icon={Unplug}
    eyebrow="Rekuest unavailable"
    title="Python flows need rekuest"
    description="A Python flow calls rekuest's actions, so it can be written and checked only while rekuest is connected."
  />
);

export const Page = asDetailQueryRoute(usePythonFlowQuery, ({ data }) => {
  const flow = data.pythonFlow;
  return (
    <RekuestGuard fallback={<NeedsRekuest />}>
      {/* A new version is a new page: fresh editor state per version. */}
      <PythonFlowWorkbench
        key={flow.id}
        base={flow}
        layout={({ title, pageActions, sidebars, body }) => (
          <FlussPythonFlow.ModelPage
            object={flow}
            title={title}
            help={FLUSS_HELP.pythonFlow}
            sidebars={sidebars}
            pageActions={
              <>
                <RunPythonFlowButton flow={flow} />
                {pageActions}
                <FlussPythonFlow.ObjectButton object={flow} />
              </>
            }
          >
            {body}
          </FlussPythonFlow.ModelPage>
        )}
      />
    </RekuestGuard>
  );
});

export default Page;
