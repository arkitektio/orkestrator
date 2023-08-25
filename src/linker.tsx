import React from "react";
import { NavLink, NavLinkProps } from "react-router-dom";
import { SelfActions, SelfActionsProps } from "./components/SelfActions";
import { Komments } from "./lok/komment/Komments";
import { KommentProps } from "./lok/komment/types";
import { Identifier } from "./mates/types";
import { LinkableModels } from "./mikro/api/graphql";
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

export type SmartKommentProps = Omit<KommentProps, "identifier">;
export type SelfActionProps = Omit<SelfActionsProps, "type">;

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

const buildKomments = (model: Identifier) => {
  return ({ ...props }: SmartKommentProps) => {
    return <Komments {...props} identifier={model} />;
  };
};

const buildSelfActions = (model: Identifier) => {
  return ({ ...props }: SmartKommentProps) => {
    return <SelfActions {...props} type={model} />;
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
  [key: Identifier]: {
    DetailLink: React.FC<ModelLinkProps>;
    ListLink: React.FC<BaseLinkProps>;
    linkBuilder: (object: string) => string;
    Smart: React.FC<CreatedSmartSmartProps>;
    Komments: React.FC<SmartKommentProps>;
    Actions: React.FC<SelfActionProps>;
  };
};

let x: GlobalRegistry = {};

export const GlobalLink = ({
  children,
  object,
  model,
  ...props
}: OmitedNavLinkProps & { object: string; model: Identifier }) => {
  return (
    <NavLink
      to={(x[model] && x[model].linkBuilder(object)) || "fake"}
      {...props}
    >
      {children}
    </NavLink>
  );
};

export const buildSmart = (model: Identifier, to: string) => {
  x[model] = {
    DetailLink: buildModelLink(model, to),
    ListLink: buildBaseLink(model, to),
    linkBuilder: linkBuilder(model, to),
    Smart: buildSmartModel(model),
    Komments: buildKomments(model),
    Actions: buildSelfActions(model),
  };

  return x[model];
};

export const MikroRepresentation = buildSmart(
  "@mikro/representation",
  "representations"
);

export const MikroGraph = buildSmart("@mikro/graph", "graphs");

export const MikroLabel = buildSmart("@mikro/label", "labels");
export const MikroFeature = buildSmart("@mikro/feature", "features");

export const MikroSample = buildSmart("@mikro/sample", "samples");

export const MikroRoi = buildSmart("@mikro/roi", "rois");

export const MikroThumbnail = buildSmart("@mikro/thumbnail", "thumbnails");

export const MikroContext = buildSmart("@mikro/context", "contexts");

export const MikroLink = buildSmart("@mikro/link", "links");

export const MikroModel = buildSmart("@mikro/model", "models");

export const MikroStage = buildSmart("@mikro/stage", "stages");

export const MikroPosition = buildSmart("@mikro/position", "positions");

export const MikroVideo = buildSmart("@mikro/video", "videos");

export const MikroDimensionMap = buildSmart(
  "@mikro/dimensionmap",
  "dimensionmaps"
);

export const MikroChannel = buildSmart("@mikro/channel", "channels");

export const MikroObjective = buildSmart("@mikro/objective", "objectives");

export const MikroInstrument = buildSmart("@mikro/instrument", "instruments");

export const MikroFile = buildSmart("@mikro/file", "files");

export const MikroView = buildSmart("@mikro/view", "views");

export const MikroEra = buildSmart("@mikro/era", "eras");

export const MikroTimepoint = buildSmart("@mikro/timepoint", "timepoints");

export const MikroMetric = buildSmart("@mikro/metric", "metrics");

export const MikroTable = buildSmart("@mikro/table", "tables");

export const MikroPlot = buildSmart("@mikro/plot", "plots");

export const MikroExperiment = buildSmart("@mikro/experiment", "experiments");

export const MikroDataset = buildSmart("@mikro/dataset", "datasets");
export const RekuestNode = buildSmart("@rekuest/node", "nodes");

export const RekuestProtocol = buildSmart("@rekuest/protocol", "protocols");

export const RekuestCollection = buildSmart(
  "@rekuest/collection",
  "collections"
);
export const RekuestReservation = buildSmart(
  "@rekuest/reservation",
  "reservations"
);
export const RekuestMirrorRepository = buildSmart(
  "@rekuest/mirrorrepository",
  "repositories"
);
export const RekuestAppRepository = buildSmart(
  "@rekuest/apprepository",
  "repositories"
);
export const RekuestProvision = buildSmart("@rekuest/provision", "provisions");

export const RekuestTestResult = buildSmart(
  "@rekuest/testresult",
  "testresults"
);

export const RekuestTestCase = buildSmart("@rekuest/testcase", "testcases");
export const RekuestAgent = buildSmart("@rekuest/agent", "agents");
export const RekuestAssignation = buildSmart(
  "@rekuest/assignation",
  "assignations"
);
export const RekuestTemplate = buildSmart("@rekuest/template", "templates");

export const FlussWorkspace = buildSmart("@fluss/workspace", "workspaces");
export const FlussFlow = buildSmart("@fluss/flow", "flows");
export const FlussRun = buildSmart("@fluss/run", "runs");
export const FlussSnapshot = buildSmart("@fluss/snapshot", "snapshots");

export const LokUser = buildSmart("@lok/user", "users");
export const LokTeam = buildSmart("@lok/team", "teams");

export const LokClient = buildSmart("@lok/client", "clients");

export const LokApp = buildSmart("@lok/app", "apps");

export const LokRelease = buildSmart("@lok/c", "releases");

export const PortContainer = buildSmart("@port/container", "containers");

export const PortWhale = buildSmart("@port/whale", "whales");

export const PortGithubRepo = buildSmart("@port/githubrepo", "githubrepos");

export const PortDeployment = buildSmart("@port/deployment", "deployments");

export const RekuestModuleLink = buildModuleLink("rekuest");
export const FlussModuleLink = buildModuleLink("fluss");
export const MikroModuleLink = buildModuleLink("mikro");
export const PortModuleLink = buildModuleLink("port");
export const LokModuleLink = buildModuleLink("lok");

export const FakeSmartModel = {
  DetailLink: buildModelLink("fake/fake", "fake"),
  ListLink: buildBaseLink("fake/fake", "fake"),
  linkBuilder: (object: string) => "fakelink",
  Smart: (props: CreatedSmartProps) => <div>{props.children}</div>,
};

export const getDefaultSmartModel = (ident: Identifier) => {
  return x[ident];
};
