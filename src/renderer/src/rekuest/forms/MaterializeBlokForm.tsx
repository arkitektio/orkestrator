import { Button } from "@/core/components/ui/button";
import { DialogFooter } from "@/core/components/ui/dialog";
import { Form } from "@/core/components/ui/form";
import { cn } from "@/core/lib/utils";
import { ApolloError } from "@apollo/client";
import { toast } from "sonner";
import {
  ListDependencyFragment,
  MaterializedBlok,
  useMaterializeBlokMutation
} from "../api/graphql";
import { useForm } from "react-hook-form";
import { DependenciesContainer } from "@/rekuest/ports/DependenciesContainer";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const dependencySelectionSchema = z.object({
  key: z.string(),
  autoResolve: z.boolean().optional(),
  mappedAgents: z.array(
    z.object({
      agent: z.string(),
      key: z.string(),
      mappedActions: z.array(z.string()),
    }),
  ),
});

const formSchema = z.object({
  dependencies: z.array(dependencySelectionSchema),
});

export type MaterializeBlokFormProps = {
  blokId: string;
  dashboardId?: string;
  prefilledAgentId?: string;
  dependencies: Array<{
    id: string;
    key: string;
    description?: string | null;
    appFilter?: string | null;
    versionFilter?: string | null;
    autoResolvable?: boolean;
    minViableInstances?: number | null;
    maxViableInstances?: number | null;
    singular?: boolean;
  }>;
  onMaterialized?: (materialized: MaterializedBlok) => void;
  onError?: (error: unknown) => void;
};



export const MaterializeBlokForm = (
  props: MaterializeBlokFormProps,
) => {
  const [materialize, { loading, error }] = useMaterializeBlokMutation();

  const normalizedDependencies: ListDependencyFragment[] = props.dependencies.map(
    (dependency) => ({
      id: dependency.id,
      key: dependency.key,
      description: dependency.description ?? null,
      appFilter: dependency.appFilter ?? null,
      versionFilter: dependency.versionFilter ?? null,
      autoResolvable: dependency.autoResolvable ?? false,
      minViableInstances: dependency.minViableInstances ?? null,
      maxViableInstances: dependency.maxViableInstances ?? null,
      singular: dependency.singular ?? true,
    }),
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dependencies: props.prefilledAgentId
        ? normalizedDependencies.map((dependency) => ({
            key: dependency.key,
            autoResolve: false,
            mappedAgents: [
              {
                agent: props.prefilledAgentId,
                key: dependency.key,
                mappedActions: [],
              },
            ],
          }))
        : [],
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const result = await materialize({
        variables: {
          input: {
            blok: props.blokId,
            dashboard: props.dashboardId,
            agentMappings: data.dependencies.map(d => ({
                 key: d.key,
                 agent: d.mappedAgents[0]?.agent // Assuming single mapping for now based on your logic
            })).filter(x => x.agent) // Only include ones that mapped to an agent
          }
        }
      });
      if (result.data?.materializeBlok) {
          props.onMaterialized?.(result.data.materializeBlok as MaterializedBlok);
      }
    } catch (e) {
      const message = (e as ApolloError).message;
      if (props.onError) {
        props.onError?.(e);
      } else {
        toast.error(message || "Failed to materialize blok");
      }
    }
  };


  if (error) {
    return <p className="text-red-500">{error.message}</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col w-full h-full mx-auto p-6 @container">
        <div className="flex flex-col sm:justify-between mb-2 h-full min-h-0">
          <div className="flex-grow mb-4 @container">
            {props.dependencies && (
              <DependenciesContainer dependencies={normalizedDependencies} bound={"blok"} />
            )}
          </div>
          <DialogFooter className="flex-initial">
            <Button
              type="submit"
              disabled={loading}
              className={cn("flex-initial", form.formState.isSubmitting && "bg-red-200")}
            >
              Submit
            </Button>
          </DialogFooter>
        </div>
      </form>
    </Form>
  );
};
