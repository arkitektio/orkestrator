import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { PageAction } from "@/core/ui/page-action";
import { RekuestAgent, RekuestImplementation, RekuestTask } from "@/core/linkers";
import { useImplementationQuery } from "@/rekuest/api/graphql";
import { useNavigate } from "react-router-dom";
import { ActionLogo } from "../components/logo/ActionLogo";
import { AssignForm } from "../forms/assign/AssignForm";
import { REKUEST_HELP } from "../help";

/**
 * Starting a run of one implementation through the action's own interface
 * (its assign bloks), with a page to itself: a scene or a panel needs more
 * room than the assign dialog has. The plain form is the dialog's.
 */
const ImplementationAssignPage = asDetailQueryRoute(useImplementationQuery, ({ data }) => {
  const navigate = useNavigate();
  const { implementation } = data;
  const { action } = implementation;

  return (
    <RekuestImplementation.ModelPage
      title={`Run ${action.name}`}
      help={REKUEST_HELP.implementation}
      object={implementation}
      pageActions={
        <>
          <RekuestImplementation.DetailLink object={implementation}>
            <PageAction>Go to Implementation</PageAction>
          </RekuestImplementation.DetailLink>
          <RekuestAgent.DetailLink object={implementation.agent}>
            <PageAction>Go to Agent</PageAction>
          </RekuestAgent.DetailLink>
        </>
      }
    >
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {action.logo && <ActionLogo action={action} className="h-8 w-8" />}
            <h1 className="scroll-m-20 truncate text-2xl font-bold tracking-tight lg:text-4xl">
              {action.name}
            </h1>
          </div>
          {action.description && (
            <p className="mt-2 text-muted-foreground">{action.description}</p>
          )}
        </div>
        <AssignForm
          target={{ implementation: implementation.id }}
          layout="inline"
          className="w-full"
          // The run is what there is to see next.
          onAssigned={(task) => navigate(RekuestTask.linkBuilder(task.id))}
        />
      </div>
    </RekuestImplementation.ModelPage>
  );
});

export default ImplementationAssignPage;
