import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  NodeDrawingFragment,
  StructureFragment,
  TermKind,
  useAssertEntityExistsMutation,
  useAssertInformsMutation,
  useAssertStructureExistsMutation,
} from "@/kraph/api/graphql";
import { ObjectButton } from "@/rekuest/buttons/ObjectButton";
import { Identifier, Object } from "@/types";
import { Equal, Microscope, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AssertionEvidence } from "../AssertionEvidence";
import { Komments } from "../komments/Komments";
import { AssignedEntity, EntityAssigner } from "../EntityAssigner";
import { TermAssigner } from "../TermAssigner";
import { MetricsTable } from "../tables/MetricsTable";

export type KnowledgeSidebarProps = {
  identifier: Identifier;
  object: Object;
};

/**
 * Where the claim just made is drawn. A claim names a word the organization
 * owns; each graph that declares a category for that word draws it under that
 * category. Drawing in no graph at all is an ordinary answer — the claim still
 * stands, no view renders it — so it gets stated rather than hidden.
 */
const ClaimDrawings = ({
  term,
  assertionId,
  drawings,
}: {
  term: string;
  assertionId: string;
  drawings: readonly NodeDrawingFragment[];
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex flex-row items-center gap-1">
      <div className="text-sm font-semibold">Claimed as {term}</div>
      <AssertionEvidence assertionId={assertionId} />
    </div>
    {drawings.length === 0 ? (
      <p className="text-xs text-muted-foreground">
        No graph declares a category for this word, so no view draws it yet.
      </p>
    ) : (
      <ul className="flex flex-col gap-1">
        {drawings.map((drawing) => (
          <li
            key={`${drawing.graph.id}-${drawing.category.id}`}
            className="text-xs text-muted-foreground"
          >
            <span className="text-foreground">{drawing.graph.name}</span> draws
            it as {drawing.category.label}
          </li>
        ))}
      </ul>
    )}
  </div>
);

/** A titled block, so the two claim shapes read as siblings rather than a form. */
const Section = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Tag;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-2">
    <div>
      <div className="flex flex-row items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
    {children}
  </section>
);

/**
 * Claiming is organization-scoped. "This ROI is an AIS" is true of the object,
 * not of one graph: the claim names a word, and every graph that declares that
 * word holds it. So there is no graph to choose here and nothing to pin — this
 * used to be an accordion over pinned graphs, one lookup per graph, which asked
 * a question the claim does not depend on.
 *
 * Two shapes of claim live here, and they are genuinely different acts:
 *
 * - **Claim as** names a *word* (`assertEntityExists`). It takes the structure
 *   directly as supporting evidence, so it needs no graph, no category and no
 *   pre-existing entity. The entity it produces is new.
 * - **Same as** names an *entity that already exists*
 *   (`assertInforms`). It says this object informs that entity — the
 *   identity claim, not a fresh one. Entities are graph-scoped, so this one
 *   does need a concrete row picked out of a specific graph.
 *
 * The discussion lives here too, as the last block. A comment is the same act
 * as the two above — a claim about this structure, recorded in the same
 * evidence log — so splitting it into its own rail tab made one subject look
 * like two, and left each tab half empty. One column, one scroll: what is
 * claimed, then what is said about it.
 */
export const KnowledgeSidebar = ({ identifier, object }: KnowledgeSidebarProps) => {
  // There is no organization-wide read for a structure by identifier + object
  // (`structureByIdentifier` still takes a graph), so the evidence already
  // recorded is fetched through the idempotent `assertStructureExists` rather than on
  // mount — viewing an object should not write one.
  const [structure, setStructure] = useState<StructureFragment | null>(null);
  const [claimed, setClaimed] = useState<{
    term: string;
    assertionId: string;
    drawings: readonly NodeDrawingFragment[];
  } | null>(null);
  const [linked, setLinked] = useState<{
    entity: AssignedEntity;
    assertionId: string;
  } | null>(null);

  const [term, setTerm] = useState<string | null>(null);
  const [sameAs, setSameAs] = useState<AssignedEntity | null>(null);

  const [ensureStructure, { loading: loadingEvidence }] =
    useAssertStructureExistsMutation();
  const [assertEntity, { loading: claiming }] = useAssertEntityExistsMutation();
  const [linkStructure, { loading: linking }] = useAssertInformsMutation();

  const loadEvidence = async () => {
    try {
      const result = await ensureStructure({
        variables: { input: { identifier, object: object.id } },
      });
      setStructure(result.data?.assertStructureExists.structure ?? null);
    } catch (e) {
      toast.error(`Could not load evidence: ${(e as Error).message}`);
    }
  };

  const claim = async () => {
    if (!term) return;
    try {
      const result = await assertEntity({
        variables: {
          input: {
            term,
            supportingEvidence: [{ identifier, object: object.id }],
          },
        },
      });
      const assertion = result.data?.assertEntityExists.assertion;
      const drawings = result.data?.assertEntityExists.drawings ?? [];
      if (assertion) setClaimed({ term, assertionId: assertion.id, drawings });
      toast.success(
        drawings.length > 0
          ? `Claimed as ${term} — drawn in ${drawings.length} graph${
              drawings.length === 1 ? "" : "s"
            }`
          : `Claimed as ${term} — no view draws it yet`,
      );
      setTerm(null);
      await loadEvidence();
    } catch (e) {
      toast.error(`Could not claim: ${(e as Error).message}`);
    }
  };

  const link = async () => {
    if (!sameAs) return;
    try {
      const result = await linkStructure({
        variables: {
          input: {
            structureIdentifier: identifier,
            structureObject: object.id,
            entityId: sameAs.id,
          },
        },
      });
      const assertion = result.data?.assertInforms.assertion;
      if (assertion) {
        setLinked({ entity: sameAs, assertionId: assertion.id });
      }
      toast.success(`Asserted as the same as ${sameAs.label}`);
      setSameAs(null);
      await loadEvidence();
    } catch (e) {
      toast.error(`Could not link: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">
      <Section
        icon={Tag}
        title="Claim as"
        description="The organization's word for what this is. Every graph that declares the word will hold the claim; one that declares no category for it simply will not draw it."
      >
        <TermAssigner
          kind={TermKind.Entity}
          value={term}
          onChange={setTerm}
          disabled={claiming}
        />
        <Button
          type="button"
          variant="outline"
          onClick={claim}
          disabled={!term || claiming}
        >
          {claiming ? "Claiming…" : "Claim"}
        </Button>
      </Section>

      {claimed ? (
        <ClaimDrawings
          term={claimed.term}
          assertionId={claimed.assertionId}
          drawings={claimed.drawings}
        />
      ) : null}

      <Separator />

      <Section
        icon={Equal}
        title="Same as"
        description="Something already claimed that this object is another view of. The structure becomes evidence for that entity rather than starting a new one."
      >
        <EntityAssigner
          value={sameAs}
          onChange={setSameAs}
          disabled={linking}
        />
        <Button
          type="button"
          variant="outline"
          onClick={link}
          disabled={!sameAs || linking}
        >
          {linking ? "Linking…" : "Assert same as"}
        </Button>
      </Section>

      {linked ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-1">
            <div className="text-sm font-semibold">
              Same as {linked.entity.label}
            </div>
            <AssertionEvidence assertionId={linked.assertionId} />
          </div>
          <p className="text-xs text-muted-foreground">
            {linked.entity.categoryLabel} in {linked.entity.graphName}
          </p>
        </div>
      ) : null}

      <Separator />

      <div className="flex flex-row gap-2">
        <ObjectButton
          objects={[{ identifier, object }]}
          className="w-full"
          disableKraph={true}
          expect={["@mikro/metric"]}
          onDone={loadEvidence}
        >
          <Button variant="outline" className="w-full">
            <Microscope className="mr-2 h-4 w-4" />
            Measure
          </Button>
        </ObjectButton>
      </div>

      {structure ? (
        structure.metrics.length > 0 ? (
          <MetricsTable metrics={structure.metrics} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Nothing has been measured on this yet.
          </p>
        )
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={loadEvidence}
          disabled={loadingEvidence}
        >
          {loadingEvidence ? "Loading…" : "Show recorded measurements"}
        </Button>
      )}

      <Separator />

      <Komments identifier={identifier} object={object} />
    </div>
  );
};
