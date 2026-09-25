import { SwitchField } from "@/core/components/fields/SwitchField";
import { Option, SearchField } from "@/core/components/fields/SearchField";
import { AutoSubmitter } from "@/core/components/form/AutoSubmitter";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Form } from "@/core/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { Separator } from "@/core/components/ui/separator";
import {
  Ordering,
  useClientsLazyQuery,
  useListTasksLazyQuery,
} from "@/rekuest/api/graphql";
import { GitBranch, RotateCcw } from "lucide-react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

export type ProvenanceFilterValue = {
  /** OAuth client id the simulation was created with (`Client.clientId`). */
  createdWith?: string | null;
  /** rekuest task id in the creation chain. */
  provenanceTask?: string | null;
  /** rekuest root-task id in the creation chain. */
  provenanceRootTask?: string | null;
  /** Only entities created by an agent (vs. a human). */
  createdByAgent?: boolean;
};

const EMPTY: ProvenanceFilterValue = {
  createdWith: null,
  provenanceTask: null,
  provenanceRootTask: null,
  createdByAgent: false,
};

const includesInsensitive = (haystack: string, needle?: string) =>
  !needle || haystack.toLowerCase().includes(needle.toLowerCase());

export type ProvenanceFilterProps = {
  value?: ProvenanceFilterValue;
  onChange: (value: ProvenanceFilterValue) => void;
};

/**
 * Reusable provenance filter (guard with `Guard.Rekuest` at the call site — it
 * queries rekuest). A popover exposing: created-by-agent, the client a run was
 * created with, and the provenance task / root task. Clients and *recent* tasks
 * are searched live against rekuest via `SearchField`. Auto-submits (debounced);
 * the parent owns the value.
 */
export const ProvenanceFilter = ({ value, onChange }: ProvenanceFilterProps) => {
  const form = useForm<ProvenanceFilterValue>({
    defaultValues: { ...EMPTY, ...value },
    mode: "onChange",
  });
  const [fetchClients] = useClientsLazyQuery();
  const [fetchTasks] = useListTasksLazyQuery();

  // rekuest `ClientFilter` has no free-text search, so we fetch a page of
  // clients and match the client-side (by app release / clientId). Value = clientId to
  // line up with `Simulation.createdWith` and `ProvenanceEntry.client.clientId`.
  // Memoised on the (stable) lazy-query fn so `SearchField`'s mount effect does
  // not re-fire on every re-render (which would loop forever).
  const searchClients = useCallback(
    async ({
      search,
      values,
    }: {
      search?: string;
      values?: (string | number)[];
    }): Promise<Option[]> => {
      const { data } = await fetchClients({
        variables: { pagination: { limit: 100, offset: 0 } },
      });
      const clients = data?.clients ?? [];
      const wanted = values?.map((v) => v.toString());
      return clients
        .map((c) => ({
          value: c.clientId,
          label: c.release
            ? `${c.release.app.identifier} ${c.release.version}`
            : c.clientId,
        }))
        .filter((o) =>
          wanted
            ? wanted.includes(o.value)
            : includesInsensitive(`${o.label} ${o.value}`, search),
        );
    },
    [fetchClients],
  );

  // Recent tasks: ordered by creation date, filtered by id when resolving a
  // selected value. `TaskFilter` also lacks free-text search → filter locally.
  const searchTasks = useCallback(
    async ({
      search,
      values,
    }: {
      search?: string;
      values?: (string | number)[];
    }): Promise<Option[]> => {
      const ids = values?.map((v) => v.toString());
      const { data } = await fetchTasks({
        variables: {
          filter: ids ? { ids } : undefined,
          ordering: [{ createdAt: Ordering.Desc }],
          pagination: { limit: 50, offset: 0 },
        },
      });
      return (data?.tasks ?? [])
        .map((t) => ({
          value: t.id,
          label: `${t.action.name}${t.reference ? ` · ${t.reference}` : ` · ${t.id.slice(0, 8)}`}`,
        }))
        .filter((o) => (ids ? true : includesInsensitive(o.label, search)));
    },
    [fetchTasks],
  );

  const handleSubmit = (v: ProvenanceFilterValue) =>
    onChange({
      createdWith: v.createdWith || null,
      provenanceTask: v.provenanceTask || null,
      provenanceRootTask: v.provenanceRootTask || null,
      createdByAgent: !!v.createdByAgent,
    });

  const activeCount = [
    value?.createdWith,
    value?.provenanceTask,
    value?.provenanceRootTask,
    value?.createdByAgent || undefined,
  ].filter(Boolean).length;

  return (
    <Form {...form}>
      <AutoSubmitter onSubmit={handleSubmit} debounce={300} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Provenance
            {activeCount > 0 && (
              <Badge variant="secondary">{activeCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 flex flex-col gap-4"
        >
          <SwitchField name="createdByAgent" label="Created by an agent" />
          <Separator />
          <SearchField
            name="createdWith"
            label="Created with client"
            search={searchClients}
            commandPlaceholder="Search clients…"
          />
          <SearchField
            name="provenanceTask"
            label="Provenance task"
            search={searchTasks}
            commandPlaceholder="Search recent tasks…"
          />
          <SearchField
            name="provenanceRootTask"
            label="Provenance root task"
            search={searchTasks}
            commandPlaceholder="Search recent tasks…"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => form.reset(EMPTY)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </PopoverContent>
      </Popover>
    </Form>
  );
};

export default ProvenanceFilter;
