import React from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import { LinkableModels } from "./mikro/api/graphql";
import { Accept, Identifier } from "./rekuest/postman/mater/mater-context";
import {
  ClassNameOptions,
  SmartModel,
  SmartModelProps,
} from "./rekuest/selection/SmartModel";

export interface CreatedSmartSmartProps<T extends Accept>
  extends Omit<SmartModelProps<T>, "accepts" | "identifier"> {
  object: string;
  dropClassName?: (props: ClassNameOptions) => string;
  dragClassName?: (props: ClassNameOptions) => string;
  dragStyle?: (props: ClassNameOptions) => React.CSSProperties;
  dropStyle?: (props: ClassNameOptions) => React.CSSProperties;
  children: React.ReactNode;
}

export type CreatedSmartProps<T extends Accept> = Omit<
  SmartModelProps<T>,
  "accepts" | "identifier"
>;

export const buildSmartModel = <T extends Accept>(
  identifier: Identifier,
  accepts: T[]
): React.FC<CreatedSmartProps<T>> => {
  return ({ children, ...props }) => {
    return (
      <SmartModel accepts={accepts} identifier={identifier} {...props}>
        {children}
      </SmartModel>
    );
  };
};

export const linkableModelToIdentifier = (model: LinkableModels) => {
  switch (model) {
    case LinkableModels.GrunnlagRepresentation:
      return "@mikro/representation";
    default:
      return undefined;
  }
};

export const identifierToLinkableModel = (identifier: Identifier) => {
  switch (identifier) {
    case "@mikro/representation":
      return LinkableModels.GrunnlagRepresentation;
    case "@mikro/omerofile":
      return LinkableModels.GrunnlagOmerofile;
    default:
      return undefined;
  }
};

export const getModelBase = (accept: Identifier) => {
  return accept.split("/")[0].split("@")[1];
};

export type OmitedNavLinkProps = Omit<NavLinkProps, "to">;
export type BaseLinkProps = OmitedNavLinkProps;
export type ModelLinkProps = OmitedNavLinkProps & { object: string };

const buildBaseLink = (model: Identifier, to: string) => {
  return ({ children, ...props }: BaseLinkProps) => {
    return (
      <NavLink {...props} to={`/user/${getModelBase(model)}/${to}`}>
        {children}
      </NavLink>
    );
  };
};

const buildModelLink = (model: Identifier, to: string) => {
  return ({ children, ...props }: ModelLinkProps) => {
    return (
      <NavLink
        {...props}
        to={`/user/${getModelBase(model)}/${to}/${props.object}`}
        title="Open"
      >
        {children}
      </NavLink>
    );
  };
};

const linkBuilder = (model: Identifier, to: string) => (object: string) => {
  return `/user/${getModelBase(model)}/${to}/${object}`;
};

const buildLinks = (model: Identifier, to: string) => {
  return [
    buildBaseLink(model, to),
    buildModelLink(model, to),
    linkBuilder(model, to),
  ];
};

export const buildModuleLink = (module: string) => {
  return ({ children, ...props }: OmitedNavLinkProps) => {
    return (
      <NavLink {...props} to={`/user/${module}`}>
        {children}
      </NavLink>
    );
  };
};

export type GlobalRegistry = {
  [key: Identifier]: (object: string) => string;
};

let x: GlobalRegistry = {};

export const GlobalLink = ({
  children,
  object,
  model,
  ...props
}: OmitedNavLinkProps & { object: string; model: Identifier }) => {
  return (
    <NavLink to={(x[model] && x[model](object)) || "fake"} {...props}>
      {children}
    </NavLink>
  );
};

export const buildSmart = <T extends Accept>(
  model: Identifier,
  to: string,
  accepts: T[]
) => {
  x[model] = linkBuilder(model, to);

  return {
    DetailLink: buildModelLink(model, to),
    ListLink: buildBaseLink(model, to),
    linkBuilder: linkBuilder(model, to),
    Smart: buildSmartModel<T>(model, accepts),
  };
};

export const Assignation = buildSmart(
  "@rekuestnext/assignation",
  "assignation",
  [
    "list:@mikro/sample",
    "item:@mikro/sample",
    "list:@mikro/model",
    "item:@mikro/model",
    "list:@mikro/experiment",
    "item:@mikro/experiment",
    "list:@mikro/representation",
    "item:@mikro/representation",
  ]
);

export const Image = buildSmart("@mikronext/image", "images", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Metric = buildSmart("@mikronext/metric", "images", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Dataset = buildSmart("@mikronext/dataset", "datasets", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const History = buildSmart("@mikronext/history", "history", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const TransformationView = buildSmart(
  "@mikronext/transformationview",
  "transformationviews",
  [
    "list:@mikro/sample",
    "item:@mikro/sample",
    "list:@mikro/model",
    "item:@mikro/model",
    "list:@mikro/experiment",
    "item:@mikro/experiment",
    "list:@mikro/representation",
    "item:@mikro/representation",
  ]
);

export const LabelView = buildSmart("@mikronext/labelview", "labelviews", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const File = buildSmart("@mikronext/file", "files", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Stage = buildSmart("@mikronext/stage", "stages", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const ChannelView = buildSmart(
  "@mikronext/channelview",
  "channelviews",
  [
    "list:@mikro/sample",
    "item:@mikro/sample",
    "list:@mikro/model",
    "item:@mikro/model",
    "list:@mikro/experiment",
    "item:@mikro/experiment",
    "list:@mikro/representation",
    "item:@mikro/representation",
  ]
);

export const OpticsView = buildSmart("@mikronext/opticsview", "opticsviews", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);
