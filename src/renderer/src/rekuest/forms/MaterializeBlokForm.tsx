import { Button } from "@/core/ui/button";
import { DialogBody, DialogFooter, DialogForm } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { useState } from "react";
import {
  ListDependencyFragment,
  MaterializedBlokFragment,
  useMaterializeBlokMutation
} from "../api/graphql";
import { useForm } from "react-hook-form";
import { DependenciesContainer } from "@arkitektio/bsx/ports/dependencies/DependenciesContainer";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { BlokMapping } from "../components/blokRematerialize";

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
  name: z.string(),
  dependencies: z.array(dependencySelectionSchema),
});

export type MaterializeBlokFormProps = {
  blokId: string;
  dashboardId?: string;
  prefilledAgentId?: string;
  /** Per-dependency agents to start from (a rematerialization's old bindings). */
  prefilledMappings?: BlokMapping[];
  /**
   * What the new blok is called, to start with (its template's name). Given,
   * the form asks for the name too; left out, the blok takes its template's.
   */
  defaultName?: string;
  /** The submit button's word. Default "Install". */
  submitLabel?: string;
  /** A Cancel button beside it, when the form sits in a dialog that has none. */
  onCancel?: () => void;
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
  onMaterialized?: (materialized: MaterializedBlokFragment) => void;
  onError?: (error: unknown) => void;
};

/**
 * Install a template: a name for the blok it makes and an agent for each
 * agent it draws from. The body scrolls, the buttons stay at the foot.
 */
export const MaterializeBlokForm = (
  props: MaterializeBlokFormProps,
) => {
  const [materialize, { loading }] = useMaterializeBlokMutation({
    refetchQueries: ["GetBlok", "ListMaterializedBloks"],
  });
  // Shown above the buttons: the form also lives in a plain <Dialog> (the
  // dashboard's drop), outside a registry dialog's error scope.
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
      name: props.defaultName ?? "",
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
        : (props.prefilledMappings ?? [])
            .filter((mapping) => normalizedDependencies.some((dependency) => dependency.key === mapping.key))
            .map((mapping) => ({
              key: mapping.key,
              autoResolve: false,
              mappedAgents: [mapping],
            })),
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setFailure(null);
    const name = data.name.trim();
    try {
      const result = await materialize({
        variables: {
          input: {
            blok: props.blokId,
            dashboard: props.dashboardId,
            // Left as the template's when it was not asked for, or is unchanged.
            name: props.defaultName !== undefined && name && name !== props.defaultName ? name : null,
            agentMappings: data.dependencies.map(d => ({
                 key: d.key,
                 agent: d.mappedAgents[0]?.agent // Assuming single mapping for now based on your logic
            })).filter(x => x.agent) // Only include ones that mapped to an agent
          }
        }
      });
      if (result.data?.materializeBlok) {
          props.onMaterialized?.(result.data.materializeBlok);
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
      <DialogForm onSubmit={form.handleSubmit(onSubmit)} className="@container">
        <DialogBody>
          {props.defaultName !== undefined && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="materialize-name">Name</Label>
              <Input id="materialize-name" placeholder={props.defaultName} {...form.register("name")} />
            </div>
          )}
          {normalizedDependencies.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Agents it runs on</span>
              <DependenciesContainer dependencies={normalizedDependencies} bound={"blok"} owner="blok" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">It needs no agent: it is ready as it is.</p>
          )}
        </DialogBody>
        <ErrorNote error={failure} title="Couldn't install the blok" />
        <DialogFooter>
          {props.onCancel && (
            <Button type="button" variant="ghost" onClick={props.onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {props.submitLabel ?? "Install"}
          </Button>
        </DialogFooter>
      </DialogForm>
    </Form>
  );
};
