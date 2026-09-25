import { StructureDisplay } from "@/components/display/StructureDisplay";
import { Badge } from "@/components/ui/badge";
import { LokUser } from "@/linkers";

import { MentionType } from "../types";

/**
 * A mention names an `Assertion.subject` — an actor id, never a user row: the
 * evidence layer knows who did something by subject, and putting a name to it
 * is lok's job. So the badge resolves the id at render time.
 */
export const Mention = ({ element }: { element: MentionType }) => {
  if (!element?.subject) return null;

  return (
    <LokUser.Smart
      object={{ id: element.subject }}
      className="inline-flex"
      containerClassName="inline"
    >
      <LokUser.DetailLink object={{ id: element.subject }} className="inline">
        <Badge
          variant="secondary"
          className="inline-flex items-center gap-1 font-normal cursor-pointer hover:bg-secondary/80"
        >
          @<StructureDisplay identifier="@lok/user" id={element.subject} variant="inline" />
        </Badge>
      </LokUser.DetailLink>
    </LokUser.Smart>
  );
};
