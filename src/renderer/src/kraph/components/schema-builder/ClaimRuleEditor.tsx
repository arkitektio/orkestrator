import { Guard } from "@/core/lib/arkitekt/host";
import { AsyncCombobox } from "@/core/components/fields/AsyncCombobox";
import { Option, SearchFunction } from "@/core/components/fields/SearchField";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { useStructureOptions } from "@/core/app/hooks/useStructureOptions";
import { Plus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ClaimField, ClaimOperator, useSearchEntityTermsLazyQuery } from "../../api/graphql";
import {
  CLAIM_KINDS,
  ClaimConditionDraft,
  ClaimRuleDraft,
  emptyCondition,
  FIELD_ORDER,
  FIELD_SPECS,
  OPERATOR_LABELS,
  summarizeRule,
} from "./claimRules";

/**
 * Edits a claim rule list (RFC 0010): which claims count. Rules are OR'd,
 * conditions inside a rule are AND'd, and each rule may carry exceptions.
 *
 * Controlled and form-agnostic like `DerivationRuleEditor`, so the same editor
 * can later serve a graph's sameness rule and a property's evidence rule.
 */
export const ClaimRulesEditor = (props: {
  value: ClaimRuleDraft[];
  onChange: (rules: ClaimRuleDraft[]) => void;
  /** Seed for a newly added rule. */
  newRule: () => ClaimRuleDraft;
}) => {
  const { value, onChange } = props;
  const setRule = (i: number, rule: ClaimRuleDraft) =>
    onChange(value.map((r, j) => (j === i ? rule : r)));

  return (
    <div className="flex flex-col gap-2">
      {value.map((rule, i) => (
        <div key={i} className="flex flex-col gap-2">
          {i > 0 && (
            <div className="text-xs uppercase tracking-wide text-muted-foreground text-center">
              or
            </div>
          )}
          <RuleCard
            rule={rule}
            onChange={(r) => setRule(i, r)}
            onRemove={() => onChange(value.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...value, props.newRule()])}
      >
        <Plus className="w-4 h-4 mr-2" /> {value.length ? "Or another rule" : "Add rule"}
      </Button>
    </div>
  );
};

const RuleCard = (props: {
  rule: ClaimRuleDraft;
  onChange: (rule: ClaimRuleDraft) => void;
  onRemove: () => void;
}) => {
  const { rule, onChange } = props;

  return (
    <div className="rounded-md border p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground truncate">{summarizeRule(rule)}</span>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={props.onRemove}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <ConditionList
        conditions={rule.when}
        onChange={(when) => onChange({ ...rule, when })}
        addLabel="And…"
      />
      {rule.unless.map((group, g) => (
        <div key={g} className="border-l-2 border-destructive/40 pl-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Unless</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onChange({ ...rule, unless: rule.unless.filter((_, j) => j !== g) })}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <ConditionList
            conditions={group.when}
            onChange={(when) =>
              onChange({
                ...rule,
                unless: rule.unless.map((u, j) => (j === g ? { when } : u)),
              })
            }
            addLabel="And…"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        onClick={() =>
          onChange({
            ...rule,
            unless: [...rule.unless, { when: [emptyCondition(ClaimField.Subject)] }],
          })
        }
      >
        <Plus className="w-3 h-3 mr-1" /> Unless…
      </Button>
    </div>
  );
};

const ConditionList = (props: {
  conditions: ClaimConditionDraft[];
  onChange: (conditions: ClaimConditionDraft[]) => void;
  addLabel: string;
}) => {
  const { conditions, onChange } = props;
  // Offer the next field not yet used — the usual path is word → who → how sure.
  const nextField =
    FIELD_ORDER.find((f) => !conditions.some((c) => c.field === f)) ?? ClaimField.Word;

  return (
    <div className="flex flex-col gap-2">
      {conditions.map((condition, i) => (
        <ConditionRow
          key={i}
          condition={condition}
          onChange={(c) => onChange(conditions.map((x, j) => (j === i ? c : x)))}
          onRemove={() => onChange(conditions.filter((_, j) => j !== i))}
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start text-muted-foreground"
        onClick={() => onChange([...conditions, emptyCondition(nextField)])}
      >
        <Plus className="w-3 h-3 mr-1" /> {props.addLabel}
      </Button>
    </div>
  );
};

const ConditionRow = (props: {
  condition: ClaimConditionDraft;
  onChange: (condition: ClaimConditionDraft) => void;
  onRemove: () => void;
}) => {
  const { condition, onChange } = props;
  const spec = FIELD_SPECS[condition.field];

  return (
    <div className="flex items-start gap-2">
      <Select
        value={condition.field}
        onValueChange={(field) => onChange(emptyCondition(field as ClaimField))}
      >
        <SelectTrigger className="w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_ORDER.map((f) => (
            <SelectItem key={f} value={f}>
              {FIELD_SPECS[f].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.operator}
        onValueChange={(operator) => onChange({ ...condition, operator: operator as ClaimOperator })}
      >
        <SelectTrigger className="w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {spec.operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1 min-w-0">
        <ConditionValue condition={condition} onChange={onChange} />
      </div>
      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={props.onRemove}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

const ConditionValue = (props: {
  condition: ClaimConditionDraft;
  onChange: (condition: ClaimConditionDraft) => void;
}) => {
  const { condition, onChange } = props;
  const spec = FIELD_SPECS[condition.field];

  switch (spec.valueType) {
    case "confidence":
      return (
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          placeholder="0 – 1"
          value={condition.value === null ? "" : String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        />
      );
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={typeof condition.value === "string" ? condition.value : ""}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        />
      );
    case "kind":
      return (
        <ValueChips
          condition={condition}
          onChange={onChange}
          search={searchKinds}
          placeholder="Pick a kind…"
        />
      );
    case "strings":
      if (condition.field === ClaimField.Word) {
        return <WordChips condition={condition} onChange={onChange} />;
      }
      if (condition.field === ClaimField.Subject) {
        // Users live in lok; without it, subjects can still be typed as ids.
        return (
          <Guard.Lok
            notConnectedFallback={<ValueChips condition={condition} onChange={onChange} placeholder="User id…" />}
            connectingFallback={<ValueChips condition={condition} onChange={onChange} placeholder="User id…" />}
          >
            <UserChips condition={condition} onChange={onChange} />
          </Guard.Lok>
        );
      }
      return (
        <ValueChips
          condition={condition}
          onChange={onChange}
          placeholder={condition.field === ClaimField.App ? "App identifier…" : "Type and press Enter…"}
        />
      );
  }
};

const searchKinds: SearchFunction = async ({ search }) =>
  CLAIM_KINDS.filter((k) => !search || k.toLowerCase().includes(search.toLowerCase())).map(
    (k) => ({ value: k, label: k.toLowerCase() }),
  );

const WordChips = (props: {
  condition: ClaimConditionDraft;
  onChange: (condition: ClaimConditionDraft) => void;
}) => {
  const [searchTerms] = useSearchEntityTermsLazyQuery();
  const search = useCallback<SearchFunction>(
    async ({ search }) => (await searchTerms({ variables: { search } })).data?.options ?? [],
    [searchTerms],
  );
  return <ValueChips {...props} search={search} placeholder="Pick a word…" />;
};

const UserChips = (props: {
  condition: ClaimConditionDraft;
  onChange: (condition: ClaimConditionDraft) => void;
}) => {
  // Lok's users, answered by lok (its option sources).
  const search = useStructureOptions("@lok/user");
  return <ValueChips {...props} search={search} placeholder="Pick a user…" />;
};

/**
 * The picked values as chips, plus one way to add another: a search combobox
 * when there is something to search, a free-text input otherwise. IS holds a
 * single value, so adding under IS replaces.
 */
const ValueChips = (props: {
  condition: ClaimConditionDraft;
  onChange: (condition: ClaimConditionDraft) => void;
  search?: SearchFunction;
  placeholder?: string;
}) => {
  const { condition, onChange, search } = props;
  const values = Array.isArray(condition.value) ? condition.value : [];
  const single = condition.operator === ClaimOperator.Is;
  const [draft, setDraft] = useState("");

  // AsyncCombobox reports only the value; remember labels as options go by so
  // a picked user shows as their username, not their id.
  const seen = useRef(new Map<string, string>());
  const recordingSearch = useCallback<SearchFunction>(
    async (args) => {
      const options = (await search?.(args)) ?? [];
      options.forEach((o: Option | null | undefined) => o && seen.current.set(o.value, o.label));
      return options;
    },
    [search],
  );

  const add = (value: string | undefined) => {
    const v = value?.trim();
    if (!v || values.includes(v)) return;
    const label = seen.current.get(v);
    onChange({
      ...condition,
      value: single ? [v] : [...values, v],
      labels: label && label !== v ? { ...condition.labels, [v]: label } : condition.labels,
    });
  };

  const remove = (v: string) =>
    onChange({ ...condition, value: values.filter((x) => x !== v) });

  return (
    <div className="flex flex-col gap-1">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {/* Under IS only the first value is sent; strike the rest rather than hide them. */}
          {values.map((v, i) => (
            <Badge
              key={v}
              variant="secondary"
              className={single && i > 0 ? "opacity-50 line-through" : undefined}
            >
              {condition.labels?.[v] ?? v}
              <button type="button" className="ml-1" onClick={() => remove(v)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {search ? (
        <AsyncCombobox
          value={undefined}
          onChange={add}
          search={recordingSearch}
          placeholder={props.placeholder}
        />
      ) : (
        <Input
          value={draft}
          placeholder={props.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
              setDraft("");
            }
          }}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
        />
      )}
    </div>
  );
};
