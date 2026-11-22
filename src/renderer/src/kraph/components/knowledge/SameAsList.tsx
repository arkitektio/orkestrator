import { DisplayWidget } from "@/core/command/Menu";
import {
  useSameAsEvidenceQuery,
  type KnowledgeInstanceFragment,
  type ListStructureFragment,
} from "@/kraph/api/graphql";
import type { Structure } from "@/core/types";

/**
 * One other member of the sameness component, shown by its evidence. Instances
 * have no names — the only thing a person recognises is the datum behind one,
 * so that is what gets rendered.
 */
const SameAsMember = ({
  evidence,
  self,
}: {
  evidence: readonly ListStructureFragment[];
  self: Structure;
}) => {
  const structures = evidence.filter(
    (structure) =>
      !(structure.identifier === self.identifier && structure.object === self.id),
  );

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

/**
 * Everything else claimed to be this same thing, by the datums behind it. One
 * request reads every member with its evidence (`Instance.members`).
 */
export const SameAsList = ({
  instance,
  self,
}: {
  instance: KnowledgeInstanceFragment;
  self: Structure;
}) => {
  const others = instance.component.filter((id) => id !== instance.id);
  const { data, loading } = useSameAsEvidenceQuery({
    variables: { id: instance.id },
    skip: others.length === 0,
  });

  if (others.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nothing else is claimed to be this {instance.term.key} yet.
      </p>
    );
  }
  if (loading && !data) {
    return <p className="text-xs text-muted-foreground">Loading…</p>;
  }
  const members = (data?.instance.members ?? []).filter((member) => member.id !== instance.id);
  return (
    <ul className="flex flex-col gap-1">
      {members.map((member) => (
        <SameAsMember key={member.id} evidence={member.evidence} self={self} />
      ))}
    </ul>
  );
};

export default SameAsList;
