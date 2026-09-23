import { StoredArkitektSession } from "../session/record";
import type { ServiceMap } from "./connection";
import {
  AliasReport,
  ModuleRegistry,
  ModuleRuntimeState,
  ServiceBuilderMap,
  ServiceRuntimeState,
} from "../types";


export const buildConfigurationIssues = (
  serviceBuilderMap: ServiceBuilderMap,
  moduleRegistry: ModuleRegistry,
  session?: StoredArkitektSession | null,
): string[] => {
  if (!session?.fakts) {
    return [];
  }

  const issues: string[] = [];

  Object.values(serviceBuilderMap).forEach((definition) => {
    if (!session.fakts.instances[definition.key] && !definition.optional) {
      issues.push(`Missing configuration for required service '${definition.key}'.`);
    }
  });

  Object.values(moduleRegistry).forEach((moduleDefinition) => {
    const requirement = moduleDefinition.requirement;

    if (!session.fakts.instances[requirement.serviceKey] && !requirement.optional) {
      issues.push(
        `Module '${moduleDefinition.key}' is missing required service '${requirement.serviceKey}'.`,
      );
    }
  });

  return Array.from(new Set(issues));
};

export const buildServiceStates = (
  serviceBuilderMap: ServiceBuilderMap,
  session: StoredArkitektSession | null,
  liveServiceMap?: ServiceMap,
  previousStates?: Record<string, ServiceRuntimeState>,
  overrides?: Record<string, Partial<ServiceRuntimeState>>,
): Record<string, ServiceRuntimeState> => {
  const states: Record<string, ServiceRuntimeState> = {};

  Object.values(serviceBuilderMap).forEach((definition) => {
    const previous = previousStates?.[definition.key];
    const instance = session?.fakts.instances[definition.key];
    const alias = session?.aliasMap.aliasMap[definition.key];
    const service = liveServiceMap?.[definition.key];

    let status: ServiceRuntimeState["status"] = "unconfigured";
    let errors = previous?.errors || [];

    if (instance) {
      if (service) {
        if (previous?.status === "invalid") {
          status = "invalid";
        } else if (previous?.status === "ready") {
          status = "ready";
        } else if (previous?.status === "checking") {
          status = "checking";
        } else {
          status = "ready";
        }
      } else if (alias) {
        status = previous?.status === "invalid" ? "invalid" : "configured";
      } else {
        status = previous?.status === "invalid" ? "invalid" : "configured";
        if (!errors.length) {
          errors = [`No alias resolved for '${definition.key}'.`];
        }
      }
    } else if (!definition.optional) {
      errors = [`Missing configuration for '${definition.key}'.`];
    }

    states[definition.key] = {
      key: definition.key,
      configured: Boolean(instance),
      definition,
      instance,
      alias,
      service,
      status,
      errors,
      lastCheckedAt: previous?.lastCheckedAt,
      revalidating: previous?.revalidating,
      ...overrides?.[definition.key],
    };
  });

  return states;
};

export const buildModuleStates = (
  moduleRegistry: ModuleRegistry,
  serviceStates: Record<string, ServiceRuntimeState>,
): Record<string, ModuleRuntimeState> => {
  const states: Record<string, ModuleRuntimeState> = {};

  Object.values(moduleRegistry).forEach((definition) => {
    const unmetRequirements: string[] = [];
    const errors: string[] = [];
    let configured = true;
    let invalid = false;
    let checking = false;

    const requirement = definition.requirement;
    const dependency = serviceStates[requirement.serviceKey];

    if (!dependency?.configured) {
      if (!requirement.optional) {
        configured = false;
        unmetRequirements.push(requirement.serviceKey);
      }
    } else {
      // Configured but with no live client — no alias resolved, so nothing in
      // the service map — is as broken as `invalid`: calling `ready` here let
      // the rail mount the module's pane, whose queries then threw "Service
      // <key> not found".
      if (dependency.status === "invalid" || dependency.status === "configured" || dependency.status === "unconfigured") {
        invalid = true;
        dependency.errors.forEach((error) => {
          errors.push(`${requirement.serviceKey}: ${error}`);
        });
      }

      if (dependency.status === "checking") {
        checking = true;
      }
    }

    states[definition.key] = {
      key: definition.key,
      definition,
      configured,
      route: definition.route,
      errors,
      unmetRequirements,
      status: definition.hidden
        ? "hidden"
        : !configured
          ? "hidden"
          : invalid
            ? "invalid"
            : checking
              ? "checking"
              : "ready",
    };
  });

  return states;
};

export const createModuleRegistryFromServices = (
  serviceBuilderMap: ServiceBuilderMap,
): ModuleRegistry => {
  const registry: ModuleRegistry = {};

  Object.values(serviceBuilderMap).forEach((definition) => {
    registry[definition.key] = {
      key: definition.key,
      route: `/${definition.key}`,
      label: definition.name || definition.key,
      requirement: { serviceKey: definition.key },
    };
  });

  return registry;
};

/**
 * What `/report/` is told, read off the checks that already ran rather than
 * probing every alias a second time. A missing required service or one that
 * did not answer makes the report non-functional; an optional one that did
 * not answer is reported with its reason but does not.
 */
export const aliasReportsFrom = (
  requirements: { key: string; optional?: boolean }[],
  states: Record<string, ServiceRuntimeState>,
): { alias_reports: Record<string, AliasReport>; functional: boolean } => {
  const alias_reports: Record<string, AliasReport> = {};
  for (const requirement of requirements) {
    const state = states[requirement.key];
    if (!state?.instance) {
      alias_reports[requirement.key] = {
        valid: false,
        reason: `Service instance not found for key: ${requirement.key}`,
      };
    } else if (state.status === "ready" && state.alias) {
      alias_reports[requirement.key] = { valid: true, alias_id: state.alias.id };
    } else {
      alias_reports[requirement.key] = {
        valid: !!requirement.optional,
        reason: state.errors[0] ?? `No working alias for ${requirement.key}`,
      };
    }
  }
  return {
    alias_reports,
    functional: Object.values(alias_reports).every((report) => report.valid),
  };
};
