import { buildModuleLink, buildScopedSmart, buildSmart } from "@/providers/smart/builder";

// Linkers for the smart models
// Linkers represent ways to reference a smart model consistently in the ui, and
// can be used to create links to the smart model, details pages, etc.
// When building a smart model, we automate the creation of a few components:
// - `Smart`, a card like drag-n-drop component that can be used to wrap a react component
// - `Actions` a component that can be used to render actions for the smart model (like nodes that have registed this smart model as an input)
// - `DetailLink` a component that can be used to link to the detail page of the smart model
// - `ListLink` a component that can be used to link to the list page of the smart model
// - `linkBuilder` a function that can be used to build links to the smart model



export const RekuestTask = buildSmart({
  identifier: "@rekuest/task",
  path: "rekuest/tasks",
  name: "Task",
});

export const RekuestState = buildSmart({
  identifier: "@rekuest/state",
  path: "rekuest/states",
  name: "State",
});

export const BlokBlok = buildSmart({
  identifier: "@blok/blok",
  path: "blok/bloks",
  name: "Blok",
});

export const RekuestAction = buildSmart({
  identifier: "@rekuest/action",
  path: "rekuest/actions",
  name: "Action",
});
export const RekuestImplementation = buildSmart({
  identifier: "@rekuest/implementation",
  path: "rekuest/implementations",
  name: "Implementation",
});
export const RekuestBlok = buildSmart({
  identifier: "@rekuest/blok",
  path: "rekuest/bloks",
  name: "Blok (Rekuest)",
});
export const RekuestMaterializedBlok = buildSmart({
  identifier: "@rekuest/materialized_blok",
  path: "rekuest/materialized_bloks",
  name: "Materialized Blok",
});
export const RekuestDependency = buildSmart({
  identifier: "@rekuest/dependency",
  path: "rekuest/dependencies",
  name: "Dependency",
});
export const RekuestResolution = buildSmart({
  identifier: "@rekuest/resolution",
  path: "rekuest/resolutions",
  name: "Resolution",
});
export const FlussFlow = buildSmart({
  identifier: "@fluss/flow",
  path: "fluss/flows",
  name: "Flow",
});
export const FlussWorkspace = buildSmart({
  identifier: "@fluss/workspace",
  path: "fluss/workspaces",
  name: "Workspace",
});
export const FlussReactiveTemplate = buildSmart({
  identifier: "@fluss/reactive_template",
  path: "fluss/reactive_templates",
  name: "Reactive Template",
});

export const FlussRun = buildSmart({
  identifier: "@fluss/run",
  path: "fluss/runs",
  name: "Run",
});

export const RekuestProvision = buildSmart({
  identifier: "@rekuest/reservation",
  path: "rekuest/provisions",
  name: "Provision",
});
export const RekuestAgent = buildSmart({
  identifier: "@rekuest/agent",
  path: "rekuest/agents",
  name: "Agent",
});
export const RekuestMemoryShelve = buildSmart({
  identifier: "@rekuest/memoryshelve",
  path: "rekuest/memoryshelves",
  name: "Memory Shelve",
});

export const RekuestShortcut = buildSmart({
  identifier: "@rekuest/shortcut",
  path: "rekuest/shortcuts",
  name: "Shortcut",
});
export const RekuestToolbox = buildSmart({
  identifier: "@rekuest/toolbox",
  path: "rekuest/toolboxes",
  name: "Toolbox",
});
export const RekuestInputStructureUsage = buildSmart({
  identifier: "@rekuest/inputstructureusage",
  path: "rekuest/inputstructureusages",
  name: "Input Structure Usage",
});

export const RekuestOutputStructureUsage = buildSmart({
  identifier: "@rekuest/outputstructureusage",
  path: "rekuest/outputstructureusages",
  name: "Output Structure Usage",
});

export const RekuestInputInterfaceUsage = buildSmart({
  identifier: "@rekuest/inputinterfaceusage",
  path: "rekuest/inputinterfaceusages",
  name: "Input Interface Usage",
});

export const RekuestOutputInterfaceUsage = buildSmart({
  identifier: "@rekuest/outputinterfaceusage",
  path: "rekuest/outputinterfaceusages",
  name: "Output Interface Usage",
});

export const RekuestStructurePackage = buildSmart({
  identifier: "@rekuest/structurepackage",
  path: "rekuest/structurepackages",
  name: "Structure Package",
});

export const RekuestStructure = buildSmart({
  identifier: "@rekuest/structure",
  path: "rekuest/structures",
  name: "Structure (Rekuest)",
});

export const RekuestInterface = buildSmart({
  identifier: "@rekuest/interface",
  path: "rekuest/interfaces",
  name: "Interface",
});

export const RekuestDescriptor = buildSmart({
  identifier: "@rekuest/descriptor",
  path: "rekuest/descriptors",
  name: "Descriptor",
});

export const RekuestDashboard = buildSmart({
  identifier: "@rekuest/dashboard",
  path: "rekuest/dashboards",
  name: "Dashboard",
});

export const MikroEntityMetric = buildSmart({
  identifier: "@mikro/entitymetric",
  path: "mikro/entitymetric",
  name: "Entity Metric",
});
export const MikroEntityRelationMetric = buildSmart({
  identifier: "@mikro/entityrelationmetric",
  path: "mikro/entityrelationmetric",
  name: "Entity Relation Metric",
});
export const MikroSubjection = buildSmart({
  identifier: "@mikro/subjection",
  path: "mikro/subjections",
  name: "Subjection",
});
export const MikroRenderedPlot = buildSmart({
  identifier: "@mikro/renderedplot",
  path: "mikro/renderedplots",
  name: "Rendered Plot",
});

export const MikroFolder = buildSmart({
  identifier: "@mikro/folder",
  path: "mikro/folders",
  name: "Folder",
  datum: true,
});

export const MikroArrayDataset = buildSmart({
  identifier: "@mikro/arraydataset",
  path: "mikro/arraydatasets",
  name: "Array Dataset",
  datum: true,
});

export const MikroCoordinateSystem = buildSmart({
  identifier: "@mikro/coordinatesystem",
  path: "mikro/coordinatesystems",
  name: "Coordinate System",
});

// A lens is a named SELECTION over an array dataset — the thing a layer renders
// through, and the thing a crop action names ("this dataset, these channels").
// Registered so it can be an argument: `MikroLens.Drop` makes a layer row a drop
// target, and `SmartContext` then assembles (Lens, Annotation) for the rekuest
// action that does the cropping.
export const MikroLens = buildSmart({
  identifier: "@mikro/lens",
  path: "mikro/lenses",
  name: "Lens",
});

export const ElektroTrace = buildSmart({
  identifier: "@elektro/trace",
  path: "elektro/traces",
  name: "Trace",
  datum: true,
});
export const ElektroBlock = buildSmart({
  identifier: "@elektro/block",
  path: "elektro/blocks",
  name: "Block",
  datum: true,
});
export const ElektroAnalogSignal = buildSmart({
  identifier: "@elektro/analogsignal",
  path: "elektro/analogsignals",
  name: "Analog Signal",
  datum: true,
});
export const ElektroAnalogSignalChannel = buildSmart({
  identifier: "@elektro/analogsignalchannel",
  path: "elektro/analogsignalchannels",
  name: "Analog Signal Channel",
  datum: true,
});

export const ElektroSimulation = buildSmart({
  identifier: "@elektro/simulation",
  path: "elektro/simulations",
  name: "Simulation",
  datum: true,
});

export const ElektroMechanism = buildSmart({
  identifier: "@elektro/mechanism",
  path: "elektro/mechanisms",
  name: "Mechanism",
});

export const ElektroEnvironment = buildSmart({
  identifier: "@elektro/environment",
  path: "elektro/environments",
  name: "Environment",
});



export const ElektroModelCollection = buildSmart({
  identifier: "@elektro/modelcollection",
  path: "elektro/modelcollections",
  name: "Model Collection",
});
export const ElektroRecording = buildSmart({
  identifier: "@elektro/recording",
  path: "elektro/recordings",
  name: "Recording",
  datum: true,
});
export const ElektroStimulus = buildSmart({
  identifier: "@elektro/stimulus",
  path: "elektro/stimuli",
  name: "Stimulus",
  datum: true,
});
export const ElektroExperiment = buildSmart({
  identifier: "@elektro/experiment",
  path: "elektro/experiments",
  name: "Experiment (Elektro)",
  datum: true,
});

export const DokumentsFile = buildSmart({
  identifier: "@dokuments/file",
  path: "dokuments/files",
  name: "File (Dokuments)",
  datum: true,
});

export const DokumentsDocument = buildSmart({
  identifier: "@dokuments/document",
  path: "dokuments/documents",
  name: "Document",
  datum: true,
});

export const DokumentsPage = buildSmart({
  identifier: "@dokuments/page",
  path: "dokuments/pages",
  name: "Page",
  datum: true,
});

export const ElektroNeuronModel = buildSmart({
  identifier: "@elektro/neuronmodel",
  path: "elektro/neuronmodels",
  name: "Neuron Model",
  datum: true,
});

export const ElektroModelWorkspace = buildSmart({
  identifier: "@elektro/modelworkspace",
  path: "elektro/modelworkspaces",
  name: "Model Workspace",
});

export const ElektroFile = buildSmart({
  identifier: "@elektro/file",
  path: "elektro/files",
  name: "File (Elektro)",
  datum: true,
});

export const ElektroDataset = buildSmart({
  identifier: "@elektro/dataset",
  path: "elektro/datasets",
  name: "Dataset (Elektro)",
  datum: true,
});

export const KraphNode = buildScopedSmart({
  identifier: "@kraph/node",
  scopedPath: (graph) => `kraph/graphs/${graph}/nodes`,
  claimPath: "kraph/instances",
  name: "Node",
});

export const KraphExpression = buildSmart({
  identifier: "@kraph/expression",
  path: "kraph/expressions",
  name: "Expression",
});

export const KraphRelation = buildSmart({
  identifier: "@kraph/relation",
  path: "kraph/relations",
  name: "Relation",
});

export const KraphStructureRelation = buildSmart({
  identifier: "@kraph/structurerelation",
  path: "kraph/structurerelations",
  name: "Structure Relation",
});

// A term is the organization's word. Categories declare it per graph, so the
// term outlives any one graph's view of it.
export const KraphTerm = buildSmart({
  identifier: "@kraph/term",
  path: "kraph/terms",
  name: "Term",
});

export const KraphStructureKind = buildSmart({
  identifier: "@kraph/structurekind",
  path: "kraph/structurekinds",
  name: "Structure Kind",
});

export const KraphNaturalEventCategory = buildSmart({
  identifier: "@kraph/naturaleventcategory",
  path: "kraph/naturaleventcategories",
  name: "Natural Event Category",
});

export const KraphProtocolEventCategory = buildSmart({
  identifier: "@kraph/protocoleventcategory",
  path: "kraph/protocoleventcategories",
  name: "Protocol Event Category",
});

export const KraphMetricKind = buildSmart({
  identifier: "@kraph/metrickind",
  path: "kraph/metrickinds",
  name: "Metric Kind",
});

export const KraphMeasurementCategory = buildSmart({
  identifier: "@kraph/measurementcategory",
  path: "kraph/measurementcategories",
  name: "Measurement Category",
});

export const KraphRelationCategory = buildSmart({
  identifier: "@kraph/relationcategory",
  path: "kraph/relationcategories",
  name: "Relation Category",
});

export const KraphStructureRelationCategory = buildSmart({
  identifier: "@kraph/structurerelationcategory",
  path: "kraph/structurerelationcategories",
  name: "Structure Relation Category",
});

export const KraphGenericCategory = buildSmart({
  identifier: "@kraph/genericcategory",
  path: "kraph/genericcategories",
  name: "Generic Category",
});

export const KraphEntityCategory = buildSmart({
  identifier: "@kraph/entitycategory",
  path: "kraph/entitycategories",
  name: "Entity Category",
});

export const KraphReagentCategory = buildSmart({
  identifier: "@kraph/reagentcategory",
  path: "kraph/reagentcategories",
  name: "Reagent Category",
});

export const KraphLinkedExpression = buildSmart({
  identifier: "@kraph/linkedexpression",
  path: "kraph/linkedexpressions",
  name: "Linked Expression",
});
export const KraphOntology = buildSmart({
  identifier: "@kraph/ontology",
  path: "kraph/ontologies",
  name: "Ontology",
});
export const KraphReagent = buildSmart({
  identifier: "@kraph/reagent",
  path: "kraph/reagents",
  name: "Reagent",
});
export const KraphProtocolEvent = buildScopedSmart({
  identifier: "@kraph/protocolevent",
  scopedPath: (graph) => `kraph/graphs/${graph}/protocolevents`,
  claimPath: "kraph/instances",
  name: "Protocol Event",
});
export const KraphNaturalEvent = buildScopedSmart({
  identifier: "@kraph/naturalevent",
  scopedPath: (graph) => `kraph/graphs/${graph}/naturalevents`,
  claimPath: "kraph/instances",
  name: "Natural Event",
});
export const KraphEntity = buildScopedSmart({
  identifier: "@kraph/entity",
  scopedPath: (graph) => `kraph/graphs/${graph}/entities`,
  claimPath: "kraph/instances",
  name: "Entity",
});
export const KraphEditEvent = buildSmart({
  identifier: "@kraph/editevent",
  path: "kraph/editevents",
  name: "Edit Event",
});
export const KraphMeasurement = buildSmart({
  identifier: "@kraph/measurement",
  path: "kraph/measurements",
  name: "Measurement",
});
export const KraphStructure = buildSmart({
  identifier: "@kraph/structure",
  path: "kraph/structures",
  name: "Structure (Kraph)",
});
export const KraphMetric = buildSmart({
  identifier: "@kraph/metric",
  path: "kraph/metrics",
  name: "Metric",
});
// The claim itself, at organization grain. A write returns one of these, and a
// dropped uuid with no graph in hand resolves here — the page lists `drawnIn`,
// the views that draw it, and links into each.
export const KraphInstance = buildSmart({
  identifier: "@kraph/instance",
  path: "kraph/instances",
  name: "Instance",
});

export const KraphLink = buildSmart({
  identifier: "@kraph/link",
  path: "kraph/links",
  name: "Link",
});

export const KraphGraph = buildSmart({
  identifier: "@kraph/graph",
  path: "kraph/graphs",
  name: "Graph",
});
export const KraphGraphView = buildSmart({
  identifier: "@kraph/graphview",
  path: "kraph/graphviews",
  name: "Graph View",
});
export const KraphPlotView = buildSmart({
  identifier: "@kraph/plotview",
  path: "kraph/plotviews",
  name: "Plot View",
});
export const KraphNodeView = buildSmart({
  identifier: "@kraph/nodeview",
  path: "kraph/nodeviews",
  name: "Node View",
});
export const KraphGraphQuery = buildSmart({
  identifier: "@kraph/graphquery",
  path: "kraph/graphqueries",
  name: "Graph Query",
});

export const KraphScatterPlot = buildSmart({
  identifier: "@kraph/scatterplot",
  path: "kraph/scatterplots",
  name: "Scatter Plot",
});
export const KraphProtocol = buildSmart({
  identifier: "@kraph/protocol",
  path: "kraph/protocols",
  name: "Protocol",
});
export const KraphProtocolStep = buildSmart({
  identifier: "@kraph/protocolstep",
  path: "kraph/protocolsteps",
  name: "Protocol Step",
});
export const KraphProtocolStepTemplate = buildSmart({
  identifier: "@kraph/protocolsteptemplate",
  path: "kraph/protocolsteptemplates",
  name: "Protocol Step Template",
});

export const OmeroArkProject = buildSmart({
  identifier: "@omeroark/project",
  path: "omero_ark/projects",
  name: "Project",
});

export const PortPod = buildSmart({
  identifier: "@port-next/pod",
  path: "port-next/pod",
  name: "Pod (Port)",
});
export const PortDefinition = buildSmart({
  identifier: "@port-next/definition",
  path: "port-next/definition",
  name: "Definition (Port)",
});

export const OmeroArkDataset = buildSmart({
  identifier: "@omeroark/dataset",
  path: "omero_ark/datasets",
  name: "Dataset (Omero Ark)",
  datum: true,
});

export const OmeroArkImage = buildSmart({
  identifier: "@omeroark/image",
  path: "omero_ark/images",
  name: "Image (Omero Ark)",
  datum: true,
});

export const MikroHistory = buildSmart({
  identifier: "@mikro/history",
  path: "mikro/history",
  name: "History",
});










export const MikroFluorophore = buildSmart({
  identifier: "@mikro/fluorophore",
  path: "mikro/fluorophores",
  name: "Fluorophore",
});

export const MikroFile = buildSmart({
  identifier: "@mikro/file",
  path: "mikro/files",
  name: "File (Mikro)",
  datum: true,
});
export const MikroScene = buildSmart({
  identifier: "@mikro/scene",
  path: "mikro/scenes",
  name: "Scene",
  datum: true,
});
export const MikroTableDataset = buildSmart({
  identifier: "@mikro/tabledataset",
  path: "mikro/tabledatasets",
  name: "Table Dataset",
  datum: true,
});







export const MikroAnnotation = buildSmart({
  identifier: "@mikro/annotation",
  path: "mikro/annotations",
  name: "Annotation",
  datum: true,
});
export const MikroEntityRelation = buildSmart({
  identifier: "@mikro/entityrelation",
  path: "mikro/entityrelations",
  name: "Entity Relation",
});

export const MikroSpecimen = buildSmart({
  identifier: "@mikro/specimen",
  path: "mikro/specimens",
  name: "Specimen",
  datum: true,
});

export const RekuestModuleLink = buildModuleLink("rekuestnext");
export const MikroModuleLink = buildModuleLink("mikro");
export const ReaktionModuleLink = buildModuleLink("fluss");
export const OmeroArkModuleLink = buildModuleLink("omero-ark");

export const LokUser = buildSmart({
  identifier: "@lok/user",
  path: "lok/users",
  name: "User",
});
export const LokOrganization = buildSmart({
  identifier: "@lok/organization",
  path: "lok/organizations",
  name: "Organization",
});
export const LokRedeemToken = buildSmart({
  identifier: "@lok/redeemtoken",
  path: "lok/redeemtokens",
  name: "Redeem Token",
});
export const LokGroup = buildSmart({
  identifier: "@lok/group",
  path: "lok/groups",
  name: "Group",
});
export const LokClient = buildSmart({
  identifier: "@lok/client",
  path: "lok/clients",
  name: "Client",
});
export const LokDevice = buildSmart({
  identifier: "@lok/device",
  path: "lok/devices",
  name: "Device ",
});
export const LokApp = buildSmart({
  identifier: "@lok/app",
  path: "lok/apps",
  name: "App",
});
export const LokRelease = buildSmart({
  identifier: "@lok/release",
  path: "lok/releases",
  name: "Release (Lok)",
});
export const LokService = buildSmart({
  identifier: "@lok/service",
  path: "lok/services",
  name: "Service",
});
export const LokBackend = buildSmart({
  identifier: "@lok/backend",
  path: "lok/backends",
  name: "Backend (Lok)",
});
export const LokServiceInstance = buildSmart({
  identifier: "@lok/serviceinstance",
  path: "lok/serviceinstances",
  name: "Service Instance",
});
export const LokLayer = buildSmart({
  identifier: "@lok/layer",
  path: "lok/layers",
  name: "Layer",
});

export const LovekitStream = buildSmart({
  identifier: "@lovekit/stream",
  path: "lovekit/streams",
  name: "Stream",
  datum: true,
});
export const LovekitSoloBroadcast = buildSmart({
  identifier: "@lovekit/solo_broadcast",
  path: "lovekit/solobroadcasts",
  name: "Solo Broadcast",
});

export const AlpakaRoom = buildSmart({
  identifier: "@alpaka/room",
  path: "alpaka/rooms",
  name: "Room",
});
export const AlpakaMessage = buildSmart({
  identifier: "@alpaka/message",
  path: "alpaka/messages",
  name: "Message",
});
export const AlpakaProvider = buildSmart({
  identifier: "@alpaka/provider",
  path: "alpaka/providers",
  name: "Provider",
});
export const AlpakaLLMModel = buildSmart({
  identifier: "@alpaka/llmmodel",
  path: "alpaka/llmmodels",
  name: "LLM Model",
});
export const AlpakaCollection = buildSmart({
  identifier: "@alpaka/collection",
  path: "alpaka/collections",
  name: "Collection",
});
export const LokMapping = buildSmart({
  identifier: "@lok/mapping",
  path: "lok/mappings",
  name: "Mapping",
});
export const LokComposition = buildSmart({
  identifier: "@lok/composition",
  path: "lok/composition",
  name: "Composition",
});

export const KabinetDefinition = buildSmart({
  identifier: "@kabinet/definition",
  path: "kabinet/definitions",
  name: "Definition (Kabinet)",
});

export const KabinetRepo = buildSmart({
  identifier: "@kabinet/repo",
  path: "kabinet/repos",
  name: "Repo",
});

export const KabinetBackend = buildSmart({
  identifier: "@kabinet/backend",
  path: "kabinet/backends",
  name: "Backend (Kabinet)",
});

export const KabinetPod = buildSmart({
  identifier: "@kabinet/pod",
  path: "kabinet/pods",
  name: "Pod (Kabinet)",
});
export const KabinetResource = buildSmart({
  identifier: "@kabinet/resource",
  path: "kabinet/resources",
  name: "Resource",
});

export const KabinetRelease = buildSmart({
  identifier: "@kabinet/release",
  path: "kabinet/releases",
  name: "Release (Kabinet)",
});

export const KabinetFlavour = buildSmart({
  identifier: "@kabinet/flavour",
  path: "kabinet/flavours",
  name: "Flavour",
});


export const RekuestSpace = buildSmart({
  identifier: "@rekuest/space",
  path: "rekuest/spaces",
  name: "Space",
});
export const RekuestAgentScene = buildSmart({
  identifier: "@rekuest/agentscene",
  path: "rekuest/agentscenes",
  name: "Agent Scene",
});
