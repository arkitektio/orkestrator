import { ScrollArea } from "@/core/components/ui/scroll-area";
import { Separator } from "@/core/components/ui/separator";
import { SheetDescription, SheetHeader, SheetTitle } from "@/core/components/ui/sheet";
import { GitBranch, MousePointerClick, Move3d, Save } from "lucide-react";

const Section = ({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-2">
    <h4 className="flex items-center gap-2 font-semibold text-sm">
      {icon}
      {title}
    </h4>
    <div className="text-xs/relaxed text-muted-foreground space-y-2">{children}</div>
  </section>
);

/**
 * Help content for the neuron model editor. Rendered inside the shared dialog
 * provider's `SheetContent` — open it via `useDialog().openSheet("neuroneditorhelp", {})`.
 * Explains how to build a model and why the 3D view re-arranges itself (NEURON
 * models are defined by connectivity, not spatial position).
 */
export const NeuronEditorHelp = () => {
  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <SheetTitle>Neuron Editor — Guide</SheetTitle>
        <SheetDescription>
          Build a multi-compartment neuron by connecting sections. Here is how the
          tools work and why the layout behaves the way it does.
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 min-h-0 px-6 pb-6">
        <div className="space-y-6">
          <Section icon={<MousePointerClick className="w-4 h-4" />} title="Selecting & editing a section">
            <p>
              Click any branch in the 3D view (or open its entry in the left panel)
              to select it. The selected section pulses pink.
            </p>
            <p>
              Each section exposes sliders for <strong>Length</strong> and{" "}
              <strong>Diameter</strong>, a <strong>Compartment</strong> selector
              (its biophysical category), and — for non-root sections — a{" "}
              <strong>Location on parent</strong> slider.
            </p>
          </Section>

          <Separator />

          <Section icon={<GitBranch className="w-4 h-4" />} title="Adding & connecting branches">
            <p>
              With a section selected, click the <strong>+</strong> button at its
              tip to add a child branch at the end, or{" "}
              <strong>Shift-click anywhere along a section</strong> to attach a new
              child at that point. The hover label shows the position as a
              percentage.
            </p>
            <p>
              Use <strong>Rebranch</strong> to reattach a section to a different
              parent — click Rebranch, then click the new parent. Cycles and
              self-connections are rejected automatically.
            </p>
            <p>
              The <strong>Location on parent</strong> slider moves where a branch
              attaches along its parent: <code>0</code> = the parent's start,{" "}
              <code>1</code> = its end. This is NEURON's connection location
              parameter.
            </p>
          </Section>

          <Separator />

          <Section icon={<Move3d className="w-4 h-4" />} title="Why does it keep rearranging?">
            <p className="text-foreground">
              The 3D positions you see are <strong>not stored</strong> — they are
              drawn fresh every time from the model's connectivity.
            </p>
            <p>
              In NEURON, a model is defined by{" "}
              <strong>which sections connect to which</strong> and{" "}
              <em>at what location</em> (0–1) along the parent — <strong>not</strong>{" "}
              by where they sit in space. There are no real X/Y/Z coordinates to
              preserve, so the editor lays everything out automatically from the
              topology.
            </p>
            <p>
              That means changing a length, adding a sibling branch, or moving a
              location can make the whole tree re-flow: branch directions are
              derived (tips point along the parent, mid-segment branches fan out to
              the side), and siblings are spread apart so they don't overlap. The
              layout is a <em>visualization</em> of the connectivity, not a canvas
              you position things on.
            </p>
            <p>
              Practical takeaway: don't fight the positions. What you are actually
              editing — and what gets saved — is the <strong>topology</strong>{" "}
              (connections + locations) and each section's length, diameter, and
              compartment.
            </p>
          </Section>

          <Separator />

          <Section icon={<Save className="w-4 h-4" />} title="Saving & validation">
            <p>
              <strong>Save Model</strong> serializes the topology and biophysics
              and stores a new edited copy of the model.
            </p>
            <p>
              Before saving, the model is validated. Structural problems block the
              save — most commonly a <strong>disconnected branch</strong> (a section
              whose parent no longer exists), a cycle, or a section with no
              length/geometry. Softer issues (e.g. several disconnected roots) warn
              but still let you save.
            </p>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
};
