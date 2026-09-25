// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AllPrimaryActionsDocument, ShortcutsDocument } from "@/rekuest/api/graphql";
import { buildDemands } from "./demands";
import { actionsVariables, shortcutsVariables } from "./queries";
import { REKUEST_ACTIONS_SECTION, REKUEST_SHORTCUTS_SECTION } from "./sections";

const image = (id: string) => ({ identifier: "@mikro/image", id });

describe("rekuest's menu prefetch", () => {
  it("warms exactly the variables the sections open with", () => {
    const target = { objects: [image("1")], collection: "c" };
    const demands = buildDemands(target);
    expect(REKUEST_ACTIONS_SECTION.prefetch?.(target)).toEqual([
      {
        service: "rekuest",
        name: "actions",
        query: AllPrimaryActionsDocument,
        variables: actionsVariables(demands.single, { collection: "c" }),
      },
    ]);
    expect(REKUEST_SHORTCUTS_SECTION.prefetch?.(target)).toEqual([
      { service: "rekuest", name: "shortcuts", query: ShortcutsDocument, variables: shortcutsVariables(demands.single) },
    ]);
  });

  it("asks differently for a partner", () => {
    const alone = REKUEST_ACTIONS_SECTION.prefetch?.({ objects: [image("1")] });
    const paired = REKUEST_ACTIONS_SECTION.prefetch?.({ objects: [image("1")], partners: [image("2")] });
    expect(paired?.[0].variables).not.toEqual(alone?.[0].variables);
  });
});
