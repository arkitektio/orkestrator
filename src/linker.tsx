import { buildSchema } from "graphql";
import { NavLink, NavLinkProps } from "react-router-dom";
import { object } from "yup";
import { Accept, Identifier } from "./rekuest/postman/mater/mater-context";
import { isIdentifier } from "typescript";
import React, { useState, useEffect } from "react";
import {
  ClassNameOptions,
  SmartModel,
  SmartModelProps,
} from "./rekuest/selection/SmartModel";
import { CommentableModels } from "./mikro/api/graphql";

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

export const Representation = buildSmart(
  "@mikro/representation",
  "representations",
  [
    "list:@mikro/sample",
    "item:@mikro/sample",
    "list:@mikro/experiment",
    "item:@mikro/experiment",
    "list:@mikro/representation",
    "item:@mikro/representation",
  ]
);

export const Label = buildSmart("@mikro/label", "labels", []);
export const Feature = buildSmart("@mikro/feature", "features", []);

export const Sample = buildSmart("@mikro/sample", "samples", [
  "list:@mikro/roi",
  "item:@mikro/roi",
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Roi = buildSmart("@mikro/roi", "rois", [
  "list:@mikro/roi",
  "item:@mikro/roi",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Context = buildSmart("@mikro/context", "contexts", [
  "list:@mikro/link",
  "item:@mikro/link",
  "list:@mikro/context",
  "item:@mikro/context",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Link = buildSmart("@mikro/link", "links", [
  "list:@mikro/link",
  "item:@mikro/link",
  "list:@mikro/context",
  "item:@mikro/context",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Model = buildSmart("@mikro/model", "models", [
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/context",
  "item:@mikro/context",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Stage = buildSmart("@mikro/stage", "stages", [
  "list:@mikro/stage",
  "item:@mikro/stage",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Position = buildSmart("@mikro/position", "positions", [
  "list:@mikro/position",
  "item:@mikro/position",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Objective = buildSmart("@mikro/objective", "objectives", [
  "list:@mikro/objective",
  "item:@mikro/objective",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Instrument = buildSmart("@mikro/instrument", "instruments", [
  "list:@mikro/instrument",
  "item:@mikro/instrument",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const MikroFile = buildSmart("@mikro/omerofile", "files", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/omerofile",
  "item:@mikro/omerofile",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Metric = buildSmart("@mikro/metric", "metrics", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/metric",
  "item:@mikro/metric",
  "list:@mikro/omerofile",
  "item:@mikro/omerofile",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Table = buildSmart("@mikro/table", "tables", [
  "list:@mikro/roi",
  "item:@mikro/roi",
  "list:@mikro/table",
  "item:@mikro/table",
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Plot = buildSmart("@mikro/plot", "plots", [
  "list:@mikro/plot",
  "item:@mikro/plot",
  "list:@mikro/table",
  "item:@mikro/table",
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Experiment = buildSmart("@mikro/experiment", "experiments", [
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Dataset = buildSmart("@mikro/dataset", "datasets", [
  "list:@mikro/dataset",
  "item:@mikro/dataset",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);
export const Node = buildSmart("@rekuest/node", "nodes", [
  "list:@rekuest/node",
  "item:@rekuest/node",
  "list:@rekuest/assignation",
  "item:@rekuest/assignation",
]);
export const Reservation = buildSmart("@rekuest/reservation", "reservations", [
  "list:@rekuest/reservation",
  "item:@rekuest/reservation",
  "list:@rekuest/node",
  "item:@rekuest/node",
]);
export const MirrorRepository = buildSmart(
  "@rekuest/mirrorrepository",
  "repositories",
  ["list:@rekuest/mirrorrepository", "item:@rekuest/mirrorrepository"]
);
export const AppRepository = buildSmart(
  "@rekuest/apprepository",
  "repositories",
  ["list:@rekuest/apprepository", "item:@rekuest/apprepository"]
);
export const Provision = buildSmart("@rekuest/provision", "provisions", [
  "list:@rekuest/provision",
  "item:@rekuest/provision",
]);
export const Agent = buildSmart("@rekuest/agent", "agents", [
  "list:@rekuest/agent",
  "item:@rekuest/agent",
  "item:@rekuest/assignation",
]);
export const Assignation = buildSmart("@rekuest/assignation", "assignations", [
  "list:@rekuest/assignation",
  "item:@rekuest/assignation",
]);
export const Template = buildSmart("@rekuest/template", "templates", [
  "list:@rekuest/template",
  "item:@rekuest/template",
]);

export const Workspace = buildSmart("@fluss/workspace", "workspaces", [
  "list:@fluss/workspace",
  "item:@fluss/workspace",
]);
export const Flow = buildSmart("@fluss/flow", "flows", [
  "list:@fluss/run",
  "item:@fluss/run",
]);
export const Run = buildSmart("@fluss/run", "runs", [
  "list:@fluss/run",
  "item:@fluss/run",
]);
export const Snapshot = buildSmart("@fluss/snapshot", "snapshots", [
  "list:@fluss/run",
  "item:@fluss/run",
]);

export const User = buildSmart("@lok/user", "users", [
  "list:@lok/user",
  "item:@lok/user",
  "list:@mikro/sample",
  "item:@mikro/sample",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);
export const Team = buildSmart("@lok/team", "teams", [
  "list:@lok/user",
  "item:@lok/user",
  "list:@lok/team",
  "item:@lok/team",
]);
export const Application = buildSmart("@lok/application", "applications", [
  "list:@lok/user",
  "item:@lok/user",
]);

export const PrivateFakt = buildSmart("@lok/privatefakt", "privatefakts", [
  "list:@lok/privatefakt",
  "item:@lok/privatefakt",
]);

export const PublicFakt = buildSmart("@lok/publicfakt", "publicfakts", [
  "list:@lok/publicfakt",
  "item:@lok/publicfakt",
]);

export const App = buildSmart("@lok/app", "apps", [
  "list:@lok/app",
  "item:@lok/app",
]);

export const Container = buildSmart("@port/container", "containers", [
  "list:@port/container",
  "item:@port/container",
]);

export const Whale = buildSmart("@port/whale", "whales", [
  "list:@port/whale",
  "item:@port/whale",
]);

export const GithubRepo = buildSmart("@port/githubrepo", "githubrepos", [
  "list:@port/githubrepo",
  "item:@port/githubrepo",
]);

export const RepoScan = buildSmart("@port/reposcan", "reposcans", [
  "list:@port/reposcan",
  "item:@port/reposcan",
]);

export const RekuestLink = buildModuleLink("rekuest");
export const FlussLink = buildModuleLink("fluss");
export const MikroLink = buildModuleLink("mikro");
export const PortLink = buildModuleLink("port");
export const LokLink = buildModuleLink("lok");

export const FakeSmartModel = {
  DetailLink: buildModelLink("fake/fake", "fake"),
  ListLink: buildBaseLink("fake/fake", "fake"),
  linkBuilder: (object: string) => "fakelink",
  Smart: (props: CreatedSmartProps<any>) => <div>{props.children}</div>,
};

export const getDefaultSmartModel = (ident: Identifier) => {
  switch (ident) {
    case "@rekuest/node":
      return Node;
    case "@rekuest/reservation":
      return Reservation;
    case "@rekuest/mirrorrepository":
      return MirrorRepository;
    case "@rekuest/apprepository":
      return AppRepository;
    case "@rekuest/provision":
      return Provision;
    case "@rekuest/agent":
      return Agent;
    case "@mikro/sample":
      return Sample;
    case "@mikro/representation":
      return Representation;
    case "@mikro/experiment":
      return Experiment;
    case "@mikro/feature":
      return Feature;
    case "@mikro/metric":
      return Metric;
    case "@mikro/roi":
      return Roi;
    case "@mikro/position":
      return Position;
    case "@mikro/acquisition":
      return Acquisition;
    case "@mikro/omerofile":
      return MikroFile;
    case "@mikro/label":
      return Label;
    case "@rekuest/assignation":
      return Assignation;
    case "@rekuest/template":
      return Template;
    case "@fluss/workspace":
      return Workspace;
    case "@fluss/flow":
      return Flow;
    case "@fluss/run":
      return Run;
    case "@fluss/snapshot":
      return Snapshot;
    case "@man/user":
      return User;
    case "@man/team":
      return Team;
    case "@man/application":
      return Application;
  }

  return null;
};

export const getIdentifierForCommentableModel = (model: CommentableModels) => {
  switch (model) {
    case CommentableModels.GrunnlagFeature:
      return "@mikro/feature";
    case CommentableModels.GrunnlagLabel:
      return "@mikro/label";
    case CommentableModels.GrunnlagSample:
      return "@mikro/sample";
    case CommentableModels.GrunnlagRepresentation:
      return "@mikro/representation";
    case CommentableModels.GrunnlagExperiment:
      return "@mikro/experiment";
    case CommentableModels.GrunnlagMetric:
      return "@mikro/metric";
    case CommentableModels.GrunnlagRoi:
      return "@mikro/roi";
    case CommentableModels.GrunnlagOmerofile:
      return "@mikro/omerofile";
  }
};
