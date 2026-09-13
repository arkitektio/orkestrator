import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useDialog } from "@/app/dialog";
import { useMemo, useRef } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ArgsContainer } from "@/components/widgets/ArgsContainer";
import { useActionDescription } from "@/lib/rekuest/ActionDescription";
import { ApolloError } from "@apollo/client";
import { toast } from "sonner";
import {
  PostmanTaskFragment,
  ResolvedDependencyInput,
} from "../api/graphql";
import { useImplementationAction } from "../hooks/useImplementationAction";
import { useImplementationForm } from "../hooks/useImplementationForm";
import { useWidgetRegistry } from "../widgets/WidgetsContext";
import { DependenciesContainer } from "@/components/widgets/DepenciesContainer";
import { DependencyDefinitionsProvider } from "../widgets/DependencyContext";

export type ImplementationAssignFormProps = {
  id: string;
  onAssign?: (task: PostmanTaskFragment) => void;
  onError?: (error: any) => void;
  args?: any;
  hidden?: { [key: string]: any };
};



export const ImplementationAssignForm = (
  props: ImplementationAssignFormProps,
) => {
  const { assign, latestTask, implementation, error } =
    useImplementationAction({
      id: props.id,
    });

  const description = useActionDescription({
    description: implementation?.action.description || "",
  });

  const overwrites = useMemo(
    () => ({ ...latestTask?.args, ...props.args }),
    [latestTask?.args, props.args],
  );

  const form = useImplementationForm({
    implementation: implementation,
    overwrites,
    reValidateMode: "onChange",
  });

  const { closeDialog } = useDialog();

  // Holding Ctrl/⌘ while submitting keeps the dialog open (assign repeatedly).
  const keepOpenRef = useRef(false);

  const onSubmit = async (data: {
    args: Record<string, unknown>;
    dependencies: Record<string, ResolvedDependencyInput>;
  }) => {
    const keepOpen = keepOpenRef.current;
    keepOpenRef.current = false;
    try {
      const task = await assign(buildAssignInput({
        implementation: props.id,
        args: data.args,
        dependencies: Object.values(data.dependencies),
        hooks: [],
      }));

      props.onAssign?.(task);
      if (!keepOpen) {
        closeDialog();
      }
    } catch (e) {
      const message = (e as ApolloError).message;
      if (props.onError) {
        props.onError?.(e);
      } else {
        if (!message) {
          toast.error("No key found");
          return;
        }
        toast.error(message);
      }
    }
  };

  const { registry } = useWidgetRegistry();

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error.message}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter") {
            keepOpenRef.current = e.ctrlKey || e.metaKey;
          }
        }}
        className="flex flex-col w-full h-full mx-auto p-6  @container"
      >
        <div className="flex flex-col sm:justify-between mb-2 h-full min-h-0">


          <h1 className="text-lg font-semibold mb-1 flex-initial ">
            {implementation?.action.name}
            <p className="text-muted-foreground text-xs">
              @ {implementation?.interface}
            </p>
          </h1>

          <div className="text-muted-foreground flex-initial my-2">{description}</div>
          <div className="flex-grow  mb-4 @container ">
            <DependencyDefinitionsProvider dependencies={implementation?.dependencies || []}>
              <ArgsContainer
                registry={registry}
                ports={implementation?.action.args || []}
                path={["args"]}
                bound={implementation?.agent.id}
                groups={implementation?.action.portGroups}
                hidden={props.hidden}
              />


              {implementation?.dependencies && (
                <DependenciesContainer dependencies={implementation?.dependencies} bound={implementation?.agent.id} />
              )}
            </DependencyDefinitionsProvider>

          </div>
          <DialogFooter className="flex-initial">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              onClick={(e) => {
                keepOpenRef.current = e.ctrlKey || e.metaKey;
              }}
              className="flex-initial gap-2"
            >
              {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </div>
      </form>
    </Form>
  );
};
