import React from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import { Identifier } from "./mates/types";
import { CommentableModels, LinkableModels } from "./mikro/api/graphql";
import {
  ClassNameOptions,
  SmartModel,
  SmartModelProps,
} from "./rekuest/selection/SmartModel";

export interface CreatedSmartSmartProps
  extends Omit<SmartModelProps, "identifier"> {
  object: string;
  dropClassName?: (props: ClassNameOptions) => string;
  dragClassName?: (props: ClassNameOptions) => string;
  dragStyle?: (props: ClassNameOptions) => React.CSSProperties;
  dropStyle?: (props: ClassNameOptions) => React.CSSProperties;
  children: React.ReactNode;
}

export type CreatedSmartProps = Omit<SmartModelProps, "identifier">;

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
  x[model] = linkBuilder(model, to);

  return {
    DetailLink: buildModelLink(model, to),
    ListLink: buildBaseLink(model, to),
    linkBuilder: linkBuilder(model, to),
    Smart: buildSmartModel(model),
  };
};

export const Representation = buildSmart(
  "@mikro/representation",
  "representations"
);

export const Image = buildSmart("@mikronext/image", "images");

export const History = buildSmart("@mikronext/history", "history");

export const TransformationView = buildSmart(
  "@mikronext/transformationview",
  "transformationviews"
);

export const LabelView = buildSmart("@mikronext/labelview", "labelviews");

export const File = buildSmart("@mikronext/file", "files");

export const ChannelView = buildSmart("@mikronext/channelview", "channelviews");

export const OpticsView = buildSmart("@mikronext/opticsview", "opticsviews");

export const Graph = buildSmart("@mikro/graph", "graphs");

export const Label = buildSmart("@mikro/label", "labels");
export const Feature = buildSmart("@mikro/feature", "features");

export const Sample = buildSmart("@mikro/sample", "samples");

export const Roi = buildSmart("@mikro/roi", "rois");

export const Thumbnail = buildSmart("@mikro/thumbnail", "thumbnails");

export const Context = buildSmart("@mikro/context", "contexts");

export const Link = buildSmart("@mikro/link", "links");

export const Model = buildSmart("@mikro/model", "models");

export const Stage = buildSmart("@mikro/stage", "stages");

export const Position = buildSmart("@mikro/position", "positions");

export const Video = buildSmart("@mikro/video", "videos");

export const DimensionMap = buildSmart("@mikro/dimensionmap", "dimensionmaps");

export const Channel = buildSmart("@mikro/channel", "channels");

export const Objective = buildSmart("@mikro/objective", "objectives");

export const Instrument = buildSmart("@mikro/instrument", "instruments");

export const MikroFile = buildSmart("@mikro/omerofile", "files");

export const View = buildSmart("@mikro/view", "views");

export const Era = buildSmart("@mikro/era", "eras");

export const Timepoint = buildSmart("@mikro/timepoint", "timepoints");

export const Metric = buildSmart("@mikro/metric", "metrics");

export const Table = buildSmart("@mikro/table", "tables");

export const Plot = buildSmart("@mikro/plot", "plots");

export const Experiment = buildSmart("@mikro/experiment", "experiments");

export const Dataset = buildSmart("@mikro/dataset", "datasets");
export const Node = buildSmart("@rekuest/node", "nodes");

export const Protocol = buildSmart("@rekuest/protocol", "protocols");

export const Collection = buildSmart("@rekuest/collection", "collections");
export const Reservation = buildSmart("@rekuest/reservation", "reservations");
export const MirrorRepository = buildSmart(
  "@rekuest/mirrorrepository",
  "repositories"
);
export const AppRepository = buildSmart(
  "@rekuest/apprepository",
  "repositories"
);
export const Provision = buildSmart("@rekuest/provision", "provisions");

export const TestResult = buildSmart("@rekuest/testresult", "testresults");

export const TestCase = buildSmart("@rekuest/testcase", "testcases");
export const Agent = buildSmart("@rekuest/agent", "agents");
export const Assignation = buildSmart("@rekuest/assignation", "assignations");
export const Template = buildSmart("@rekuest/template", "templates");

export const Workspace = buildSmart("@fluss/workspace", "workspaces");
export const Flow = buildSmart("@fluss/flow", "flows");
export const Run = buildSmart("@fluss/run", "runs");
export const Snapshot = buildSmart("@fluss/snapshot", "snapshots");

export const User = buildSmart("@lok/user", "users");
export const Team = buildSmart("@lok/team", "teams");

export const Client = buildSmart("@lok/client", "clients");

export const App = buildSmart("@lok/app", "apps");

export const Release = buildSmart("@lok/c", "releases");

export const Container = buildSmart("@port/container", "containers");

export const Whale = buildSmart("@port/whale", "whales");

export const GithubRepo = buildSmart("@port/githubrepo", "githubrepos");

export const Deployment = buildSmart("@port/deployment", "deployments");

export const RekuestLink = buildModuleLink("rekuest");
export const FlussLink = buildModuleLink("fluss");
export const MikroLink = buildModuleLink("mikro");
export const PortLink = buildModuleLink("port");
export const LokLink = buildModuleLink("lok");

export const FakeSmartModel = {
  DetailLink: buildModelLink("fake/fake", "fake"),
  ListLink: buildBaseLink("fake/fake", "fake"),
  linkBuilder: (object: string) => "fakelink",
  Smart: (props: CreatedSmartProps) => <div>{props.children}</div>,
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
    case "@mikro/stage":
      return Stage;
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
    case "@lok/user":
      return User;
    case "@lok/team":
      return Team;
    case "@lok/client":
      return Client;
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
