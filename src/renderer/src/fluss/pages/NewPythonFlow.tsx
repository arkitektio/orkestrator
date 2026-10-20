import { PageLayout } from "@/core/layout/PageLayout";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { FLUSS_HELP } from "../help";
import { PythonFlowWorkbench } from "../python/PythonFlowWorkbench";
import { NeedsRekuest } from "./PythonFlow";

/** A flow that does not exist yet: its first save makes the first version. */
const Page = () => (
  <RekuestGuard fallback={<NeedsRekuest />}>
    <PythonFlowWorkbench
      base={null}
      layout={({ title, pageActions, sidebars, body }) => (
        <PageLayout title={title} help={FLUSS_HELP.newPythonFlow} sidebars={sidebars} pageActions={pageActions}>
          {body}
        </PageLayout>
      )}
    />
  </RekuestGuard>
);

export default Page;
