import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { FlussPythonRun, RekuestTask } from "@/core/linkers";
import { PageAction } from "@/core/ui/page-action";
import { usePythonRunQuery } from "@/fluss/api/graphql";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FLUSS_HELP } from "../help";
import { PythonRunTrace } from "../python/PythonRunTrace";
import { NeedsRekuest } from "./PythonFlow";

/** One Python run on its source. Its calls and log are its task's, one click away. */
export const Page = asDetailQueryRoute(usePythonRunQuery, ({ data }) => {
  const navigate = useNavigate();
  const run = data.pythonRun;
  return (
    <FlussPythonRun.ModelPage
      object={run}
      title={`Run of ${run.flow.title}`}
      help={FLUSS_HELP.pythonRun}
      pageActions={
        <PageAction
          size="sm"
          variant="outline"
          icon={<ListChecks className="h-4 w-4" />}
          onClick={() => navigate(RekuestTask.linkBuilder(run.taskId))}
        >
          Open task
        </PageAction>
      }
    >
      <RekuestGuard fallback={<NeedsRekuest />}>
        <PythonRunTrace run={run} />
      </RekuestGuard>
    </FlussPythonRun.ModelPage>
  );
});

export default Page;
