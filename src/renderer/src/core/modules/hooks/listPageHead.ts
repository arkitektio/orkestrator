import type { ComponentType } from "react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useModuleHostVersion } from "@/core/modules/host/host";
import type { NavLinkDecl } from "@/core/modules/host/define";
import { moduleDefinitions, moduleNavLinks } from "@/core/modules/registries";
import { collectionPath } from "@/core/modules/spec/models";

/** What a model's list page opens with: the module-home header's three parts. */
export type ListPageHead = {
  /** The module the model belongs to, for the fallback icon. */
  namespace: string;
  icon?: ComponentType<{ className?: string }>;
  label: string;
  description: string;
};

/**
 * The head of `identifier`'s list page at `pathname`, or null when the model
 * declares no `description` in its manifest — the header is opt-in per model,
 * so a module that draws its own explainer is not given a second one.
 *
 * The description is the manifest's. The icon and label are the nav link's
 * (the rail and ⌘K row): the link of the page itself when it has one (a page
 * per spec has its own glyph), else the link of the model's list route.
 */
export const listPageHead = (
  identifier: string,
  pathname: string,
  links: readonly (NavLinkDecl & { module: string })[] = moduleNavLinks(),
): ListPageHead | null => {
  for (const definition of moduleDefinitions()) {
    const { manifest } = definition;
    const model = manifest.models?.find((candidate) => candidate.identifier === identifier);
    if (!model) continue;
    if (!model.description) return null;
    const listRoute = `/${collectionPath(manifest, model.path)}`;
    const own = links.filter((link) => link.module === manifest.namespace);
    const here = own.find((link) => link.route === pathname);
    const list = own.find((link) => link.route === listRoute);
    return {
      namespace: manifest.namespace,
      icon: here?.icon ?? list?.icon,
      label: here?.label ?? list?.label ?? model.name,
      description: model.description,
    };
  }
  return null;
};

/** `listPageHead` for the current location, re-read when a module arrives or leaves. */
export const useListPageHead = (identifier: string): ListPageHead | null => {
  const { pathname } = useLocation();
  const version = useModuleHostVersion();
  return useMemo(
    () => listPageHead(identifier, pathname),
    // `version` is the dependency: the registries are rebuilt when it moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identifier, pathname, version],
  );
};
