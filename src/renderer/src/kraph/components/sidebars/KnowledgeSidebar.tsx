import { Guard } from "@/core/lib/arkitekt/host";
import { Separator } from "@/core/components/ui/separator";
import { useSelf } from "@/core/connection/useSelf";
import { SmartDropZone } from "@/core/providers/smart/Drop";
import { Identifier, Object } from "@/core/types";
import { Komments } from "../komments/Komments";
import { LabelsBlock } from "../knowledge/LabelsBlock";
import { MeasurementsBlock } from "../knowledge/MeasurementsBlock";
import { useKnowledge } from "../knowledge/useKnowledge";

export type KnowledgeSidebarProps = {
  identifier: Identifier;
  object: Object;
};

/** The labels block, with the signed-in user known so claims can read "by you". */
const LabelsWithMe = (props: KnowledgeSidebarProps) => {
  // Who "me" is belongs to the session, not to lok: read it from the host.
  const { userId } = useSelf();
  return <LabelsBlock {...props} meId={userId ?? undefined} />;
};

/** Measurements need the same read as the labels; Apollo dedupes it from the cache. */
const Measurements = (props: KnowledgeSidebarProps) => {
  const { metrics, refetch } = useKnowledge(props.identifier, props.object);
  return <MeasurementsBlock {...props} metrics={metrics} onChanged={() => refetch()} />;
};

/**
 * What is known about a datum, and the ways to add to it — read first, claimed
 * in place. Claiming is organization-scoped: "this is an AIS" is true of the
 * object, not of one graph; the claim names a word, and every graph that
 * declares that word holds it. So nothing here asks for a graph.
 *
 * Top to bottom:
 *
 * - **This is …** — the words this datum has been called, as chips. Typing a
 *   word and pressing Enter claims it (`assertEntityExists` with the datum as
 *   supporting evidence); a new word needs no separate step. A chip opens its
 *   card: where the claim is drawn (a link into each graph), what else is
 *   claimed to be the same thing, and the ways to say "so is that one" — drop
 *   a datum on the card, or on the whole panel to get the "Same thing as…"
 *   action, which is also in the context menu and the `ObjectButton`.
 * - **Measurements** — the metrics recorded on the datum, and "Measure".
 * - **Discussion** — a comment is the same act as the claims above, recorded
 *   in the same log, so it lives in the same column.
 *
 * Viewing writes nothing: the read is `structureByIdentifier`, and a datum
 * nobody has claimed about is an ordinary empty state.
 */
export const KnowledgeSidebar = ({ identifier, object }: KnowledgeSidebarProps) => (
  <SmartDropZone
    identifier={identifier}
    object={object}
    className="flex h-full flex-col gap-4 overflow-y-auto p-3"
  >
    <Guard.Lok notConnectedFallback={<LabelsBlock identifier={identifier} object={object} />}>
      <LabelsWithMe identifier={identifier} object={object} />
    </Guard.Lok>

    <Separator />

    <Measurements identifier={identifier} object={object} />

    <Separator />

    <Komments identifier={identifier} object={object} />
  </SmartDropZone>
);

export default KnowledgeSidebar;
