import type { Action } from "@/lib/localactions/LocalActionProvider";
import type { SmartSectionRegistry } from "./extensions/sectionRegistry";

/**
 * The app's registries, as the smart layer sees them.
 *
 * `providers/smart` is host library code: every module's `linkers` builds on
 * it, so it must not import `app/*` registries (which import every module) —
 * that made any linker the entry to the whole app and turned eval order into
 * luck. The app hands its registries over instead, the way
 * `configureSmartBuilder` hands over its adapters: `app/localactions` and
 * `app/smartcontext` call `provideSmartRegistries` when they are evaluated.
 */
type SmartRegistries = {
  actions: Record<string, Action<any>>;
  sections: SmartSectionRegistry;
};

const registries: SmartRegistries = {
  actions: {},
  sections: { sections: [] },
};

export const provideSmartRegistries = (provided: Partial<SmartRegistries>) => {
  Object.assign(registries, provided);
};

export const smartActions = () => registries.actions;
export const smartSections = () => registries.sections;
