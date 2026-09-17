import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Plus, Radio, Trash2, Zap } from "lucide-react";
import {
  EditableNetConnection,
  EditableNetStimulator,
  EditableNetSynapse,
} from "../../lib/modelSerialization";
import { QuantityInput } from "../QuantityInput";

export type NetworkEditorProps = {
  synapses: EditableNetSynapse[];
  stimulators: EditableNetStimulator[];
  connections: EditableNetConnection[];
  /** Section ids of the active cell — the synapse location choices. */
  sectionIds: string[];

  onAddSynapse: () => void;
  onUpdateSynapse: (id: string, patch: Partial<EditableNetSynapse>) => void;
  onRemoveSynapse: (id: string) => void;

  onAddStimulator: () => void;
  onUpdateStimulator: (id: string, patch: Partial<EditableNetStimulator>) => void;
  onRemoveStimulator: (id: string) => void;

  onAddConnection: () => void;
  onUpdateConnection: (id: string, patch: Partial<EditableNetConnection>) => void;
  onRemoveConnection: (id: string) => void;
};

const short = (id: string) => id.slice(0, 8);

const GroupHeader = ({
  icon,
  title,
  count,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  onAdd: () => void;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5 text-xs font-semibold">
      {icon}
      <span>{title}</span>
      <span className="font-normal text-muted-foreground">({count})</span>
    </div>
    <Button
      size="sm"
      variant="outline"
      className="h-6 px-2 text-xs"
      onClick={onAdd}
    >
      <Plus className="mr-1 h-3 w-3" />
      Add
    </Button>
  </div>
);

const RowShell = ({
  id,
  onRemove,
  children,
}: {
  id: string;
  onRemove: () => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-2 rounded-md border p-2">
    <div className="flex items-center justify-between">
      <span className="truncate font-mono text-[10px] text-muted-foreground">
        {short(id)}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 flex-none p-0 text-destructive"
        title="Delete"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
    {children}
  </div>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <Label className="text-[10px]">{label}</Label>
    {children}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <p className="px-1 py-2 text-[11px] text-muted-foreground">{text}</p>
);

/**
 * Editor for the model's network layer: create/edit/delete synapses (placed on
 * a section at a position, with exp2syn kinetics), stimulators (spike sources),
 * and connections (wiring a stimulator to a synapse). All state lives in the
 * parent's model-wide config and round-trips on save.
 */
export const NetworkEditor = ({
  synapses,
  stimulators,
  connections,
  sectionIds,
  onAddSynapse,
  onUpdateSynapse,
  onRemoveSynapse,
  onAddStimulator,
  onUpdateStimulator,
  onRemoveStimulator,
  onAddConnection,
  onUpdateConnection,
  onRemoveConnection,
}: NetworkEditorProps) => {
  return (
    <div className="flex flex-col gap-6 px-1 pt-2">
      {/* Synapses */}
      <section className="space-y-2">
        <GroupHeader
          icon={<Zap className="h-3.5 w-3.5 text-amber-500" />}
          title="Synapses"
          count={synapses.length}
          onAdd={onAddSynapse}
        />
        {synapses.length === 0 ? (
          <EmptyHint text="No synapses. Add one to place it on a section." />
        ) : (
          synapses.map((s) => (
            <RowShell key={s.id} id={s.id} onRemove={() => onRemoveSynapse(s.id)}>
              <Field label="Section">
                <Select
                  value={s.location}
                  onValueChange={(v) => onUpdateSynapse(s.id, { location: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Pick a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionIds.map((id) => (
                      <SelectItem key={id} value={id} className="font-mono text-xs">
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`Position (${(s.position * 100).toFixed(0)}%)`}>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[s.position]}
                  onValueChange={([v]) => onUpdateSynapse(s.id, { position: v })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reversal e">
                  <QuantityInput
                    dimension="voltage"
                    value={s.e}
                    onChange={(v) => onUpdateSynapse(s.id, { e: v })}
                  />
                </Field>
                <Field label="τ1 (rise)">
                  <QuantityInput
                    dimension="time"
                    value={s.tau1}
                    onChange={(v) => onUpdateSynapse(s.id, { tau1: v })}
                  />
                </Field>
                <Field label="τ2 (decay)">
                  <QuantityInput
                    dimension="time"
                    value={s.tau2}
                    onChange={(v) => onUpdateSynapse(s.id, { tau2: v })}
                  />
                </Field>
              </div>
            </RowShell>
          ))
        )}
      </section>

      {/* Stimulators */}
      <section className="space-y-2">
        <GroupHeader
          icon={<Radio className="h-3.5 w-3.5 text-chart-4" />}
          title="Stimulators"
          count={stimulators.length}
          onAdd={onAddStimulator}
        />
        {stimulators.length === 0 ? (
          <EmptyHint text="No stimulators. Add a spike source to drive synapses." />
        ) : (
          stimulators.map((s) => (
            <RowShell
              key={s.id}
              id={s.id}
              onRemove={() => onRemoveStimulator(s.id)}
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start">
                  <QuantityInput
                    dimension="time"
                    value={s.start}
                    onChange={(v) => onUpdateStimulator(s.id, { start: v })}
                  />
                </Field>
                <Field label="Number">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="h-8 text-xs"
                    value={s.number}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n)) onUpdateStimulator(s.id, { number: n });
                    }}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Interval (between spikes)">
                    <QuantityInput
                      dimension="time"
                      value={s.interval}
                      onChange={(v) => onUpdateStimulator(s.id, { interval: v })}
                    />
                  </Field>
                </div>
              </div>
            </RowShell>
          ))
        )}
      </section>

      {/* Connections */}
      <section className="space-y-2">
        <GroupHeader
          icon={<ArrowRight className="h-3.5 w-3.5 text-chart-2" />}
          title="Connections"
          count={connections.length}
          onAdd={onAddConnection}
        />
        {stimulators.length === 0 || synapses.length === 0 ? (
          <EmptyHint text="Add at least one stimulator and one synapse to wire a connection." />
        ) : connections.length === 0 ? (
          <EmptyHint text="No connections. Wire a stimulator to a synapse." />
        ) : (
          connections.map((c) => (
            <RowShell
              key={c.id}
              id={c.id}
              onRemove={() => onRemoveConnection(c.id)}
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Stimulator">
                  <Select
                    value={c.netStimulator}
                    onValueChange={(v) =>
                      onUpdateConnection(c.id, { netStimulator: v })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stimulators.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="font-mono text-xs"
                        >
                          {short(s.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Synapse">
                  <Select
                    value={c.synapse}
                    onValueChange={(v) => onUpdateConnection(c.id, { synapse: v })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {synapses.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="font-mono text-xs"
                        >
                          {short(s.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="col-span-2">
                  <Field label="Weight (conductance)">
                    <QuantityInput
                      dimension="conductance"
                      value={c.weight}
                      onChange={(v) => onUpdateConnection(c.id, { weight: v })}
                    />
                  </Field>
                </div>
              </div>
            </RowShell>
          ))
        )}
      </section>
    </div>
  );
};

export default NetworkEditor;
