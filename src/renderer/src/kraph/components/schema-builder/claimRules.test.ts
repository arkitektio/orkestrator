// @vitest-environment jsdom
// (importing the generated `graphql.ts` pulls in the Apollo hooks barrel, which
// touches `window` on load)
import { describe, expect, it } from "vitest";
import { ClaimField, ClaimOperator } from "../../api/graphql";
import {
  emptyCondition,
  FIELD_SPECS,
  summarizeRules,
  toCategoryDefinition,
  toConditionInput,
  validateRules,
  wordRule,
} from "./claimRules";

describe("claim rule drafts", () => {
  it("resets to the field's first valid operator", () => {
    for (const field of Object.values(ClaimField)) {
      const c = emptyCondition(field);
      expect(FIELD_SPECS[field].operators).toContain(c.operator);
    }
  });

  it("sends IS as a single string and IN as a list", () => {
    const draft = { field: ClaimField.Word, operator: ClaimOperator.In, value: ["AIS", "axon"] };
    expect(toConditionInput(draft)?.value).toEqual(["AIS", "axon"]);
    expect(toConditionInput({ ...draft, operator: ClaimOperator.Is })?.value).toBe("AIS");
  });

  it("rejects empty lists and out-of-range confidence", () => {
    expect(toConditionInput(emptyCondition(ClaimField.Subject))).toBeNull();
    const conf = { field: ClaimField.Confidence, operator: ClaimOperator.AtLeast };
    expect(toConditionInput({ ...conf, value: "1.5" })).toBeNull();
    expect(toConditionInput({ ...conf, value: "0.8" })?.value).toBe(0.8);
  });

  it("sends datetimes as ISO", () => {
    const c = toConditionInput({
      field: ClaimField.AssertedAt,
      operator: ClaimOperator.Since,
      value: "2026-01-01T10:00",
    });
    expect(c?.value).toBe(new Date("2026-01-01T10:00").toISOString());
  });

  it("validates before building a definition", () => {
    expect(validateRules([])).not.toBeNull();
    expect(toCategoryDefinition([wordRule(null)])).toBeNull();
    const rule = wordRule("AIS");
    rule.when.push({
      field: ClaimField.Subject,
      operator: ClaimOperator.In,
      value: ["u1"],
      labels: { u1: "alice" },
    });
    rule.unless.push({ when: [] });
    expect(validateRules([rule])).toBeNull();
    expect(toCategoryDefinition([rule])).toEqual({
      rules: [
        {
          when: [
            { field: ClaimField.Word, operator: ClaimOperator.In, value: ["AIS"] },
            { field: ClaimField.Subject, operator: ClaimOperator.In, value: ["u1"] },
          ],
          unless: null,
        },
      ],
    });
    expect(summarizeRules([rule])).toBe("Exists when (the word is AIS and claimed by alice).");
  });
});
