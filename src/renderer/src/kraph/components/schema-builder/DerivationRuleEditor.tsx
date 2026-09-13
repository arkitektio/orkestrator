import { AsyncCombobox } from "@/components/fields/AsyncCombobox";
import { OrderedStringList } from "@/components/fields/OrderedFreeformListField";
import { Option } from "@/components/fields/SearchField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useCallback } from "react";
import {
  AggregationFunction,
  DerivationRule,
  DerivationType,
  ValueKind,
  useSearchMetricKeysLazyQuery,
  useSearchStructureKindIdentifiersLazyQuery,
  useSearchStructureKindsLazyQuery,
} from "../../api/graphql";
import {
  buildDerivationRule,
  DEFAULT_AGGREGATION,
  DEFAULT_DERIVATION,
  DerivationRuleLike,
} from "./utils";

/**
 * How a property gets its value.
 *
 * A property is not a column — it is a standing instruction for folding
 * measurements. This editor reads in the order the fold happens, which is also
 * the order the questions actually arise:
 *
 *   Source  — which measurement words this property reads
 *   Fold    — how the readings become one value
 *   Trust   — whose reading wins when they disagree
 *
 * Inline rather than behind a "Configure" modal, per the schema-builder
 * guidelines: a modal over the inspector hides the property you are configuring.
 */

/**
 * `subjectPriority` and `toolPriority` are documented against a `DerivationType`
 * each — they are inert under the other two. Show a list only where it bites.
 */
const PRIORITY_FOR: Partial<Record<DerivationType, "subject" | "tool">> = {
  [DerivationType.PriorityLatest]: "subject",
  [DerivationType.LatestAssertionTool]: "tool",
};

const DERIVATION_BLURB: Record<DerivationType, string> = {
  [DerivationType.Latest]: "The most recent measurement wins.",
  [DerivationType.PriorityLatest]:
    "The first subject below with any measurement wins. Subjects not listed are considered only if none of the listed ones have measured.",
  [DerivationType.Rollup]:
    "Every contributing measurement is folded together with the aggregation above.",
  [DerivationType.LatestAssertionTool]:
    "The most recent measurement from the most trusted tool wins.",
};

export const DerivationRuleEditor = (props: {
  derivation: DerivationType | null | undefined;
  rule: DerivationRuleLike | null | undefined;
  /** The structure kind id backing `rule.sourceNode`, if it has been resolved. */
  sourceKindId?: string | null;
  onChange: (next: {
    derivation: DerivationType;
    rule: DerivationRule;
    sourceKindId?: string | null;
  }) => void;
}) => {
  const derivation = props.derivation || DEFAULT_DERIVATION;
  const rule = buildDerivationRule(props.rule);

  const [searchStructureKinds] = useSearchStructureKindIdentifiersLazyQuery();
  const [searchStructureKindRows] = useSearchStructureKindsLazyQuery();
  const [searchMetricKeys] = useSearchMetricKeysLazyQuery();

  const patch = (
    changes: DerivationRuleLike,
    extra?: { derivation?: DerivationType; sourceKindId?: string | null },
  ) =>
    props.onChange({
      derivation: extra?.derivation ?? derivation,
      rule: buildDerivationRule({ ...rule, ...changes }),
      sourceKindId:
        extra?.sourceKindId !== undefined ? extra.sourceKindId : props.sourceKindId,
    });

  const structureSearch = useCallback(
    async ({ search }: { search?: string }): Promise<Option[]> => {
      const res = await searchStructureKinds({ variables: { search } });
      return res.data?.options ?? [];
    },
    [searchStructureKinds],
  );

  // The metric search is scoped by the structure kind's *id*, while the rule
  // stores its *identifier* — so when a rule comes back from the server with a
  // sourceNode but no resolved id, look the id up before the keys can be scoped.
  const metricSearch = useCallback(
    async ({ search }: { search?: string }): Promise<Option[]> => {
      let kindId = props.sourceKindId ?? undefined;
      if (!kindId && rule.sourceNode) {
        const resolved = await searchStructureKindRows({
          variables: { search: rule.sourceNode },
        });
        kindId = resolved.data?.options?.[0]?.value;
      }
      const res = await searchMetricKeys({
        variables: { search, structureKind: kindId },
      });
      return res.data?.options ?? [];
    },
    [searchMetricKeys, searchStructureKindRows, props.sourceKindId, rule.sourceNode],
  );

  // `conflictPolicy` is gone. What to do about disagreement is the derivation
  // itself now — PRIORITY_LATEST ranks subjects, LATEST_ASSERTION_TOOL ranks
  // tools — so there is one answer to give instead of two that could contradict
  // each other.
  const priorityKind = PRIORITY_FOR[derivation];
  const wantsSubjects = priorityKind === "subject" && rule.subjectPriority.length === 0;
  const wantsTools = priorityKind === "tool" && rule.toolPriority.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Source ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <Label className="font-medium">What it reads</Label>
          <p className="text-xs text-muted-foreground">
            The measurement words this property trusts.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Describing structure</Label>
          <AsyncCombobox
            value={rule.sourceNode}
            onChange={(sourceNode) =>
              // Changing the source invalidates the key picked under the old
              // one — a metric key only means something on its own kind.
              patch(
                { sourceNode, key: undefined },
                { sourceKindId: null },
              )
            }
            search={structureSearch}
            placeholder="Any structure"
            commandPlaceholder="Search structure kinds…"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Measurement key</Label>
          <AsyncCombobox
            // Remount when the source changes so a stale key list cannot linger.
            key={rule.sourceNode ?? "unscoped"}
            value={rule.key}
            onChange={(key) => patch({ key })}
            search={metricSearch}
            placeholder="Any key"
            commandPlaceholder="Search measurement keys…"
            emptyPlaceholder={
              rule.sourceNode
                ? "No measurement keys recorded on that structure kind."
                : "Pick a structure first, or search all keys."
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Source value kind</Label>
          <Select
            value={rule.sourceValueKind ?? "__any"}
            onValueChange={(v) =>
              patch({
                sourceValueKind:
                  v === "__any" ? undefined : (v as ValueKind),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Unambiguous — read any</SelectItem>
              {Object.values(ValueKind).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Only needed when the key has been recorded in more than one value
            kind. INT and FLOAT are read together either way.
          </p>
        </div>
      </div>

      {/* ── Fold ───────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t pt-4">
        <div>
          <Label className="font-medium">How it folds</Label>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Derivation</Label>
          <Select
            value={derivation}
            onValueChange={(v) =>
              patch({}, { derivation: v as DerivationType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DerivationType).map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {DERIVATION_BLURB[derivation]}
          </p>
        </div>

        {derivation === DerivationType.Rollup && (
          <div className="space-y-2">
            <Label className="text-xs">Aggregation</Label>
            <Select
              value={rule.aggregation || DEFAULT_AGGREGATION}
              onValueChange={(v) =>
                patch({ aggregation: v as AggregationFunction })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AggregationFunction).map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The property's own value kind is the aggregation's{" "}
              <em>result</em> type, not the source's — COUNT yields INT over
              STRING sources.
            </p>
          </div>
        )}
      </div>

      {/* ── Trust ──────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t pt-4">
        <div>
          <Label className="font-medium">Whose reading wins</Label>
          <p className="text-xs text-muted-foreground">
            Two people measuring the same thing differently is an ordinary state,
            not an error. The fold above says what to do about it.
          </p>
        </div>

        {!priorityKind && (
          <p className="text-xs text-muted-foreground">
            {DERIVATION_BLURB[derivation]} Nothing to rank — pick
            PRIORITY_LATEST or LATEST_ASSERTION_TOOL above to name whose reading
            is trusted.
          </p>
        )}

        {priorityKind === "subject" && (
          <div className="space-y-2">
            <Label className="text-xs">Subjects, most trusted first</Label>
            <OrderedStringList
              value={rule.subjectPriority}
              onChange={(subjectPriority) => patch({ subjectPriority })}
              placeholder="User id or agent identity…"
              rankNote={(index) =>
                index === 0
                  ? "— checked first"
                  : `— only if ${rule.subjectPriority[index - 1] ?? "the above"} has not measured`
              }
            />
            <p className="text-xs text-muted-foreground">
              Free text: a subject is a user id or an automated agent's identity,
              and nothing enumerates them.
            </p>
          </div>
        )}

        {priorityKind === "tool" && (
          <div className="space-y-2">
            <Label className="text-xs">Tools, most trusted first</Label>
            <OrderedStringList
              value={rule.toolPriority}
              onChange={(toolPriority) => patch({ toolPriority })}
              placeholder="App id…"
              rankNote={(index) => (index === 0 ? "— checked first" : "")}
            />
          </div>
        )}

        {wantsSubjects && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              PRIORITY_LATEST with no subjects listed has nothing to rank.
            </AlertDescription>
          </Alert>
        )}
        {wantsTools && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              LATEST_ASSERTION_TOOL with no tools listed has nothing to rank.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DerivationRuleEditor;
