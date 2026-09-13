import { Option } from "@/components/fields/ListSearchField";

export type SearchFunction = (search: string) => Promise<Option[]>;

export type Registration = {
  identifier: string;
  /** Human-readable name shown in labels and validation messages. */
  name?: string;
  description?: string;
  path: string;
  search?: SearchFunction;
  /**
   * Whether objects of this model are *datums*: things a scientist makes
   * claims about (an image, an ROI, a trace, a document). Only datums get the
   * Knowledge sidebar; infrastructure (actions, agents, users, categories)
   * does not.
   */
  datum: boolean;
};

/**
 * Fallback display name derived from an identifier when no descriptive
 * name was registered: "@mikro/instance_mask-view" -> "Instance Mask View".
 */
export const humanizeIdentifier = (identifier: string): string => {
  const withoutModule = identifier.includes("/")
    ? identifier.split("/").slice(1).join("/")
    : identifier;
  return withoutModule
    .split(/[_\-\s/]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export class SmartRegistry {
  private registry: Map<string, Registration> = new Map<string, Registration>();

  public constructor() {
    this.registry = new Map<string, Registration>();
  }

  register(registration: Registration) {
    this.registry.set(registration.identifier, registration);
  }

  registeredModels(): Registration[] {
    const registrations = Array.from(this.registry.values());
    return registrations;
  }

  findModel(identifier: string): Registration | undefined {
    return this.registry.get(identifier);
  }

  getModelPath(identifier: string): string | undefined {
    const model = this.findModel(identifier);
    return model?.path;
  }

  /** `false` for unknown identifiers: nothing unregistered is a datum. */
  isDatum(identifier: string): boolean {
    return this.findModel(identifier)?.datum ?? false;
  }

  /**
   * Reverse identifier -> descriptive name lookup. Uses the name given at
   * registration (see linkers.tsx) and falls back to a humanized identifier.
   */
  getDisplayName(identifier: string): string {
    const model = this.findModel(identifier);
    return model?.name || humanizeIdentifier(identifier);
  }

  buildModelPath(identifier: string, id: string): string | undefined {
    const model = this.findModel(identifier);
    if (!model) return undefined;
    return `${model.path}/${id}`;
  }
}

export const smartRegistry = new SmartRegistry();

export const useModels = (search?: string) => {
  return smartRegistry
    .registeredModels()
    .filter(
      (predicate) =>
        search == undefined ||
        search == "" ||
        predicate.identifier.includes(search),
    );
};
