import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ErrorNote } from "@/core/ui/error-note";
import { cn } from "@/core/util/utils";
import { useState } from "react";
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
    optional?: boolean;
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
  const [materialize, { loading }] = useMaterializeBlokMutation();
  // Shown above the button: the form lives in a plain <Dialog>, which stays
  // open to try again.
  const [failure, setFailure] = useState<unknown>(null);

  const normalizedDependencies: ListDependencyFragment[] = props.dependencies.map(
    (dependency) => ({
      id: dependency.id,
      key: dependency.key,
      description: dependency.description ?? null,
      appFilter: dependency.appFilter ?? null,
      versionFilter: dependency.versionFilter ?? null,
      autoResolvable: dependency.autoResolvable ?? false,
      optional: dependency.optional ?? false,
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
              },
            ],
          }))
        : [],
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setFailure(null);
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
      if (props.onError) {
        props.onError(e);
      } else {
        setFailure(e);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col w-full h-full mx-auto p-6 @container">
        <div className="flex flex-col sm:justify-between mb-2 h-full min-h-0">
          <div className="flex-grow mb-4 @container">
            {props.dependencies && (
              <DependenciesContainer dependencies={normalizedDependencies} bound={"blok"} owner="blok" />
            )}
          </div>
          <ErrorNote error={failure} title="Couldn't materialize the blok" className="mb-2" />
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
