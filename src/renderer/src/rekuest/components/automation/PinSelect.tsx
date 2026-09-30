import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { useAutomationPinOptionsQuery } from "@/rekuest/api/graphql";
import { AgentStatusDot, agentStatus } from "../displays/AgentStatusDot";

export type Pin = { agent: string; interface: string };

const ANY = "__any__";
const keyOf = (pin: Pin) => `${pin.agent}::${pin.interface}`;

/**
 * Where every run goes: any app that implements the action (resolved per
 * run, the default), or one agent's implementation.
 */
export const PinSelect = ({
  action,
  value,
  onChange,
}: {
  action: string;
  value: Pin | null;
  onChange: (pin: Pin | null) => void;
}) => {
  const { data } = useAutomationPinOptionsQuery({ variables: { action } });
  const implementations = data?.implementations ?? [];

  return (
    <Select
      value={value ? keyOf(value) : ANY}
      onValueChange={(key) => {
        if (key === ANY) return onChange(null);
        const [agent, iface] = key.split("::");
        onChange({ agent, interface: iface });
      }}
    >
      <SelectTrigger className="h-8 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Any app that implements it</SelectItem>
        {implementations.map((implementation) => (
          <SelectItem
            key={implementation.id}
            value={keyOf({ agent: implementation.agent.id, interface: implementation.interface })}
          >
            <span className="flex items-center gap-2">
              <AgentStatusDot status={agentStatus(implementation.agent)} />
              {implementation.agent.name}
              <span className="text-muted-foreground">{implementation.interface}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
