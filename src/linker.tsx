import React from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import { CommentableModels, LinkableModels } from "./mikro/api/graphql";
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

export const Representation = buildSmart(
  "@mikro/representation",
  "representations",
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

export const Graph = buildSmart("@mikro/graph", "graphs", [
  "list:@mikro/graph",
  "item:@mikro/graph",
  "list:@mikro/model",
  "item:@mikro/model",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

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

export const Thumbnail = buildSmart("@mikro/thumbnail", "thumbnails", [
  "list:@mikro/thumbnail",
  "item:@mikro/thumbnail",
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

export const Video = buildSmart("@mikro/video", "videos", [
  "list:@mikro/video",
  "item:@mikro/video",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const DimensionMap = buildSmart("@mikro/dimensionmap", "dimensionmaps", [
  "list:@mikro/dimensionmap",
  "item:@mikro/dimensionmap",
  "list:@mikro/position",
  "item:@mikro/position",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Channel = buildSmart("@mikro/channel", "channels", [
  "list:@mikro/channel",
  "item:@mikro/channel",
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

export const View = buildSmart("@mikro/view", "views", [
  "list:@mikro/view",
  "item:@mikro/view",
  "list:@mikro/omerofile",
  "item:@mikro/omerofile",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Era = buildSmart("@mikro/era", "eras", [
  "list:@mikro/era",
  "item:@mikro/era",
  "list:@mikro/omerofile",
  "item:@mikro/omerofile",
  "list:@mikro/experiment",
  "item:@mikro/experiment",
  "list:@mikro/representation",
  "item:@mikro/representation",
]);

export const Timepoint = buildSmart("@mikro/timepoint", "timepoints", [
  "list:@mikro/timepoint",
  "item:@mikro/timepoint",
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

export const Protocol = buildSmart("@rekuest/protocol", "protocols", [
  "list:@rekuest/protocol",
  "item:@rekuest/protocol",
  "list:@rekuest/assignation",
  "item:@rekuest/assignation",
]);

export const Collection = buildSmart("@rekuest/collection", "collections", [
  "list:@rekuest/collection",
  "item:@rekuest/collection",
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

export const TestResult = buildSmart("@rekuest/testresult", "testresults", [
  "list:@rekuest/testresult",
  "item:@rekuest/testresult",
]);

export const TestCase = buildSmart("@rekuest/testcase", "testcases", [
  "list:@rekuest/testcase",
  "item:@rekuest/testcase",
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

export const Client = buildSmart("@lok/client", "clients", [
  "list:@lok/client",
  "item:@lok/client",
]);

export const App = buildSmart("@lok/app", "apps", [
  "list:@lok/app",
  "item:@lok/app",
]);

export const Release = buildSmart("@lok/c", "releases", [
  "list:@lok/release",
  "item:@lok/release",
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

export const Deployment = buildSmart("@port/deployment", "deployments", [
  "list:@port/deployment",
  "item:@port/deployment",
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
