import { PaneLink } from "@/components/ui/sidepane";
import { NavLink } from "react-router-dom";
import {
  getSmartBuilderAdapters,
  SmartListPageProps,
  SmartModelPage,
  SmartNewButtonProps,
  SmartObjectButtonProps,
} from "./buildSmartAdapters";
import { SmartDropZone } from "./Drop";
import { SearchFunction, smartRegistry } from "./registry";
import { SmartModel } from "./SmartModel";
import {
  BaseLinkProps,
  CreatedSmartSmartProps,
  ModelLinkProps,
  OmitedNavLinkProps,
  SmartPaneLinkProps,
} from "./types";
import { Object, Identifier } from "@/types";
import { cn } from "@/lib/utils";

const buildBaseLink = (to: string) => {
  return ({ children, ...props }: BaseLinkProps) => {
    return (
      <NavLink {...props} to={`/${to}`}>
        {children}
      </NavLink>
    );
  };
};

export const SmartLink = ({
  identifier,
  object,
  subroute,
  subobject,
  deeproute,
  children,
  ...props
}: {
  identifier: string;
  object: string;
  subroute?: string;
  subobject?: string;
  deeproute?: string;
} & OmitedNavLinkProps) => {
  const model = smartRegistry.findModel(identifier);
  if (!model) {
    return null;
  }

  return (
    <NavLink
      {...props}
      to={`/${model.path}/${encodeURIComponent(object)}${subroute ? `/${subroute}` : ""}${subobject ? `/${subobject}` : ""}${deeproute ? `/${deeproute}` : ""}`}
      title="Open"
      className={props.className}
    >
      {children}
    </NavLink>
  );
};

export const buildModelLink = <T extends Object>(to: string) => {
  return ({
    children,
    subroute,
    subobject,
    deeproute,
    ...props
  }: ModelLinkProps<T>) => {
    return (
      <NavLink
        {...props}
        to={`/${to}/${encodeURIComponent(props.object.id)}${subroute ? `/${subroute}` : ""}${subobject ? `/${subobject}` : ""}${deeproute ? `/${deeproute}` : ""}`}
        title="Open"
        className={cn("hover:text-primary transition-colors", props.className)}
      >
        {children}
      </NavLink>
    );
  };
};

export const buildPaneLink = <T extends Object>(to: string) => {
  return ({
    children,
    subroute,
    subobject,
    deeproute,
    ...props
  }: SmartPaneLinkProps<T>) => {
    return (
      <PaneLink
        {...props}
        to={`/${to}/${encodeURIComponent(props.object.id)}${subroute ? `/${subroute}` : ""}${subobject ? `/${subobject}` : ""}${deeproute ? `/${deeproute}` : ""}`}
      >
        {children}
      </PaneLink>
    );
  };
};

export const linkBuilder = (to: string) => (objectId: string | undefined) => {
  if (!objectId) {
    return `/error`;
  }

  return `/${to}/${encodeURIComponent(objectId)}`;
};

export const buildSmartModel = <T extends Object>(
  identifier: Identifier,
): React.FC<CreatedSmartSmartProps<T>> => {
  return ({ children, ...props }) => {
    return (
      <SmartModel identifier={identifier} {...props}>
        {children}
      </SmartModel>
    );
  };
};

export const buildDropModel = <T extends Object>(
  identifier: Identifier,
): React.FC<CreatedSmartSmartProps<T>> => {
  return ({ children, ...props }) => {
    return (
      <SmartDropZone identifier={identifier} {...props}>
        {children}
      </SmartDropZone>
    );
  };
};

export type ObjectProps<T extends Object> = {
  object: T;
};

const buildSelfActions = (_model: Identifier) => {
  return (_props: ObjectProps<any>) => {
    return <></>;
  };
};

/**
 * The claims made about this object and the discussion about it are one
 * surface (`KnowledgeSidebar`), so there is one builder for them.
 *
 * Only a *datum* has knowledge in this sense — see `SmartConfig.datum`. For
 * every other model this renders nothing, so a page that hands in
 * `<X.Knowledge>` for an action or a category shows no half-empty claim form.
 */
const buildKnowledge = <T extends Object>(model: Identifier) => {
  return ({ ...props }: ObjectProps<T>) => {
    if (!smartRegistry.isDatum(model)) {
      return null;
    }
    return getSmartBuilderAdapters().renderKnowledge({
      identifier: model,
      object: props.object,
    });
  };
};

const buildTinyKnowledge = <T extends Object>(model: Identifier) => {
  return ({ ...props }: ObjectProps<T>) => {
    if (!smartRegistry.isDatum(model)) {
      return null;
    }
    return getSmartBuilderAdapters().renderTinyKnowledge({
      identifier: model,
      object: props.object,
    });
  };
};

const buildModelPage = <T extends Object>(model: Identifier) => {
  return ({ ...props }: SmartModelPage<T>) => {
    return getSmartBuilderAdapters().renderModelPage({
      identifier: model,
      ...props,
    });
  };
};

const buildListPage = (model: Identifier) => {
  return ({ ...props }: SmartListPageProps) => {
    return getSmartBuilderAdapters().renderListPage({
      identifier: model,
      ...props,
    });
  };
};

const buildObjectButton = (model: Identifier) => {
  return ({ object, ...props }: SmartObjectButtonProps) => {
    return getSmartBuilderAdapters().renderObjectButton({
      identifier: model,
      object,
      ...props,
    });
  };
};

const buildNewButton = (model: Identifier) => {
  return ({ ...props }: SmartNewButtonProps) => {
    return getSmartBuilderAdapters().renderNewButton({
      identifier: model,
      ...props,
    });
  };
};

/**
 * What a smart model is, in one place. The identifier is the wire name every
 * structure carries (`@mikro/arraydataset`); `path` is the route segment its
 * detail and list pages live under.
 */
export type SmartConfig = {
  identifier: Identifier;
  /** Route segment for the model's pages, e.g. `"mikro/arraydatasets"`. */
  path: string;
  /** Descriptive name used in labels and validation messages. */
  name?: string;
  description?: string;
  search?: SearchFunction;
  /**
   * A datum is an object a scientist makes claims *about*: an image, an ROI, a
   * trace, a document. Claims ("this is an AIS", "same as that entity"),
   * measurements and comments — the whole Knowledge sidebar — only make sense
   * for those. Infrastructure (an action, an agent, a user, a category) is not
   * a datum, and gets no Knowledge tab. Defaults to `false`.
   */
  datum?: boolean;
};

export const buildSmart = <T extends Object>(config: SmartConfig) => {
  const { identifier, path } = config;

  smartRegistry.register({
    identifier,
    path,
    name: config.name,
    search: config.search,
    description: config.description || "A smart model",
    datum: config.datum ?? false,
  });

  return {
    DetailLink: buildModelLink<T>(path),
    PaneLink: buildPaneLink<T>(path),
    ListLink: buildBaseLink(path),
    linkBuilder: linkBuilder(path),
    Smart: buildSmartModel<T>(identifier),
    Drop: buildDropModel<T>(identifier),
    Actions: buildSelfActions(identifier),
    Knowledge: buildKnowledge<T>(identifier),
    TinyKnowledge: buildTinyKnowledge<T>(identifier),
    identifier,
    ModelPage: buildModelPage<T>(identifier),
    ListPage: buildListPage(identifier),
    ObjectButton: buildObjectButton(identifier),
    NewButton: buildNewButton(identifier),
  };
};

export type ScopedSmartConfig = Omit<SmartConfig, "path"> & {
  /** Where a bare id of this kind goes when no scope is known: the claim page. */
  claimPath: string;
  /** Where the same id goes when its scope (the graph drawing it) is known. */
  scopedPath: (scope: string) => string;
};

/**
 * A model whose detail page lives *inside* something else — for kraph, inside the
 * graph that draws it.
 *
 * Two grains, one identity. A claim (`Instance`, `Link`) is organization-grain
 * and addressed by a bare uuid; a *drawing* of it exists only inside one graph
 * and carries everything a rich detail page shows. Identity stays claim-grain —
 * `Smart`, `Drop`, `ObjectButton` and every local-action `condition` keep taking
 * `{ identifier, id }` with that bare uuid, which is the only thing a
 * drag-and-drop payload can honestly carry. Only the *destination* varies.
 *
 * So `scope` is optional, and the fallback is the point: a call site that knows
 * its graph gets the view page; one that does not — the command palette, a drop
 * from another module, a rekuest return port — gets `claimPath`, the claim page,
 * which lists `drawnIn` and links onward. No caller is ever forced to invent a
 * graph, and nothing re-encodes `graph:id` back into one string, which is
 * precisely the `GraphID` scalar the backend deleted.
 */
export const buildScopedSmart = <T extends Object>({
  claimPath,
  scopedPath,
  ...config
}: ScopedSmartConfig) => {
  const pathFor = (scope?: string) => (scope ? scopedPath(scope) : claimPath);

  // Registers under `claimPath`: the registry answers "where does a bare id of
  // this kind go", and that is the claim page. Generic navigate/popout actions
  // resolve through it.
  const base = buildSmart<T>({ ...config, path: claimPath });

  return {
    ...base,
    DetailLink: ({ scope, ...props }: ModelLinkProps<T> & { scope?: string }) =>
      buildModelLink<T>(pathFor(scope))(props),
    PaneLink: ({ scope, ...props }: SmartPaneLinkProps<T> & { scope?: string }) =>
      buildPaneLink<T>(pathFor(scope))(props),
    linkBuilder: (objectId: string | undefined, scope?: string) =>
      linkBuilder(pathFor(scope))(objectId),
  };
};

export type Smart = ReturnType<typeof buildSmart>;

export const buildModuleLink = (module: string) => {
  return ({ children, ...props }: OmitedNavLinkProps) => {
    return (
      <NavLink {...props} to={`/${module}`}>
        {children}
      </NavLink>
    );
  };
};
