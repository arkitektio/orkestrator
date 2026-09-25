import { Guard } from "@/core/lib/arkitekt/host";
import { GraphQLSearchField } from "@/core/components/fields/GraphQLSearchField";
import { SwitchField } from "@/core/components/fields/SwitchField";
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
import { useUserOptionsLazyQuery } from "@/lok/api/graphql";
import { RotateCcw, User } from "lucide-react";
import { useForm } from "react-hook-form";

export type UserFilterValue = {
  /** Creator user id. */
  createdBy?: string | null;
  /** Only entities created by the current user. */
  mine?: boolean;
};

const EMPTY: UserFilterValue = { createdBy: null, mine: false };

export type UserFilterProps = {
  value?: UserFilterValue;
  onChange: (value: UserFilterValue) => void;
};

/**
 * Reusable user filter popover: pick a creator (searched live against lok) and
 * an "only mine" toggle. The user picker is wrapped in `Guard.Lok` so it
 * degrades gracefully when lok is unavailable; the toggle still works.
 * Auto-submits (debounced); the parent owns the value.
 */
export const UserFilter = ({ value, onChange }: UserFilterProps) => {
  const form = useForm<UserFilterValue>({
    defaultValues: { ...EMPTY, ...value },
    mode: "onChange",
  });
  const [searchUsers] = useUserOptionsLazyQuery();

  const handleSubmit = (v: UserFilterValue) =>
    onChange({ createdBy: v.createdBy || null, mine: !!v.mine });

  const activeCount = [value?.createdBy, value?.mine || undefined].filter(
    Boolean,
  ).length;

  return (
    <Form {...form}>
      <AutoSubmitter onSubmit={handleSubmit} debounce={300} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <User className="h-4 w-4" />
            User
            {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 flex flex-col gap-4">
          <SwitchField name="mine" label="Only mine" />
          <Separator />
          <Guard.Lok notConnectedFallback={<></>} connectingFallback={<></>}>
            <GraphQLSearchField
              name="createdBy"
              label="Created by"
              searchQuery={searchUsers}
              commandPlaceholder="Search users…"
            />
          </Guard.Lok>
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

export default UserFilter;
