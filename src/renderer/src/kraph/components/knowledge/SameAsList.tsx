import { DisplayWidget } from "@/command/Menu";
import {
  useInformingStructuresQuery,
  type KnowledgeInstanceFragment,
} from "@/kraph/api/graphql";
import type { Structure } from "@/types";

/**
 * One other member of the sameness component, shown by its evidence. Instances
 * have no names — the only thing a person recognises is the datum behind one,
 * so that is what gets rendered. One read per member until the backend exposes
 * `Instance.evidence`; components are small, so this stays cheap.
 */
const SameAsMember = ({
  instanceId,
  self,
}: {
  instanceId: string;
  self: Structure;
}) => {
  const { data, loading } = useInformingStructuresQuery({
    variables: { entityId: instanceId },
  });
  const structures = (data?.informingStructures ?? []).filter(
    (structure) =>
      !(structure.identifier === self.identifier && structure.object === self.id),
  );

  if (loading && !data) {
    return <li className="text-xs text-muted-foreground">Loading…</li>;
  }
  if (structures.length === 0) {
    return (
      <li className="text-xs text-muted-foreground">
        A claim with no datum of its own
      </li>
    );
  }
  return (
    <>
      {structures.map((structure) => (
        <li key={structure.id} className="min-w-0">
          <DisplayWidget
            identifier={structure.identifier}
            id={structure.object}
            link
            context="command"
          />
        </li>
      ))}
    </>
  );
};

/** Everything else claimed to be this same thing, by the datums behind it. */
export const SameAsList = ({
  instance,
  self,
}: {
  instance: KnowledgeInstanceFragment;
  self: Structure;
}) => {
  const members = instance.component.filter((id) => id !== instance.id);

  if (members.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nothing else is claimed to be this {instance.term.key} yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {members.map((id) => (
        <SameAsMember key={id} instanceId={id} self={self} />
      ))}
    </ul>
  );
};

export default SameAsList;
