// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { AllPrimaryActionsDocument, ShortcutsDocument } from "@/rekuest/api/graphql";
import { buildDemands } from "./demands";
import { actionsVariables, shortcutsVariables } from "./queries";
import { agentStructure } from "./agent";
import {
  REKUEST_ACTIONS_SECTION,
  REKUEST_SHORTCUTS_SECTION,
  REKUEST_SUPERVISOR_SECTION,
} from "./sections";

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

  it("lists a supervised agent's supervisor actions under Supervisor, and not under Run", () => {
    const target = { objects: [agentStructure({ id: "a1", supervisor: "plugin_engine" })] };
    const demands = buildDemands(target);
    expect(REKUEST_SUPERVISOR_SECTION.applies(target)).toBe(true);
    expect(REKUEST_SUPERVISOR_SECTION.prefetch?.(target)).toEqual([
      {
        service: "rekuest",
        name: "supervisor",
        query: AllPrimaryActionsDocument,
        variables: actionsVariables(demands.single, { app: "plugin_engine" }),
      },
    ]);
    expect(REKUEST_ACTIONS_SECTION.prefetch?.(target)?.[0].variables).toEqual(
      actionsVariables(demands.single, { exceptApp: "plugin_engine" }),
    );
  });

  it("has no Supervisor section for an agent without one, or for two agents", () => {
    const plain = { objects: [agentStructure({ id: "a1" })] };
    expect(REKUEST_SUPERVISOR_SECTION.applies(plain)).toBe(false);
    expect(REKUEST_SUPERVISOR_SECTION.prefetch?.(plain)).toEqual([]);
    const two = {
      objects: [
        agentStructure({ id: "a1", supervisor: "plugin_engine" }),
        agentStructure({ id: "a2", supervisor: "plugin_engine" }),
      ],
    };
    expect(REKUEST_SUPERVISOR_SECTION.applies(two)).toBe(false);
  });

  it("asks differently for a partner", () => {
    const alone = REKUEST_ACTIONS_SECTION.prefetch?.({ objects: [image("1")] });
    const paired = REKUEST_ACTIONS_SECTION.prefetch?.({ objects: [image("1")], partners: [image("2")] });
    expect(paired?.[0].variables).not.toEqual(alone?.[0].variables);
  });
});
