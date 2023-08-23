import React from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import { Identifier } from "./mates/types";
import { LinkableModels } from "./mikro/api/graphql";
import {
  ClassNameOptions,
  SmartModel,
  SmartModelProps,
} from "./rekuest/selection/SmartModel";

export interface CreatedSmartSmartProps
  extends Omit<SmartModelProps, "accepts" | "identifier"> {
  object: string;
  dropClassName?: (props: ClassNameOptions) => string;
  dragClassName?: (props: ClassNameOptions) => string;
  dragStyle?: (props: ClassNameOptions) => React.CSSProperties;
  dropStyle?: (props: ClassNameOptions) => React.CSSProperties;
  children: React.ReactNode;
}

export type CreatedSmartProps = Omit<SmartModelProps, "accepts" | "identifier">;

export const buildSmartModel = (
  identifier: Identifier
): React.FC<CreatedSmartProps> => {
  return ({ children, ...props }) => {
    return (
      <SmartModel identifier={identifier} {...props}>
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

const buildBaseLink = (to: string) => {
  return ({ children, ...props }: BaseLinkProps) => {
    return (
      <NavLink {...props} to={`/user/${to}`}>
        {children}
      </NavLink>
    );
  };
};

const buildModelLink = (to: string) => {
  return ({ children, ...props }: ModelLinkProps) => {
    return (
      <NavLink {...props} to={`/user/${to}/${props.object}`} title="Open">
        {children}
      </NavLink>
    );
  };
};

const linkBuilder = (to: string) => (object: string) => {
  return `/user/${to}/${object}`;
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

export const buildSmart = (model: Identifier, to: string) => {
  x[model] = linkBuilder(to);

  return {
    DetailLink: buildModelLink(to),
    ListLink: buildBaseLink(to),
    linkBuilder: linkBuilder(to),
    Smart: buildSmartModel(model),
  };
};

export const Assignation = buildSmart(
  "@rekuestnext/assignation",
  "assignation"
);

export const Image = buildSmart("@mikronext/image", "mikronext/images");

export const Metric = buildSmart("@mikronext/metric", "mikronext/metrics");

export const Dataset = buildSmart("@mikronext/dataset", "mikronext/datasets");

export const History = buildSmart("@mikronext/history", "mikronext/history");

export const TransformationView = buildSmart(
  "@mikronext/transformationview",
  "transformationviews"
);

export const LabelView = buildSmart(
  "@mikronext/labelview",
  "mikronext/labelviews"
);

export const File = buildSmart("@mikronext/file", "mikronext/files");

export const Stage = buildSmart("@mikronext/stage", "mikronext/stages");

export const ChannelView = buildSmart(
  "@mikronext/channelview",
  "mikronext/channelviews"
);

export const OpticsView = buildSmart(
  "@mikronext/opticsview",
  "mikronext/opticsviews"
);
