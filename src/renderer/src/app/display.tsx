import { ModelWorkspaceDisplay } from "@/elektro/displays/ModelWorkspaceDisplay";
import { NeuronModelDisplay } from "@/elektro/displays/NeuronModelDisplay";
import { PodDisplay } from "@/kabinet/displays/PodDisplay";
import { EntityCategoryDisplay } from "@/kraph/displays/EntityCategoryDisplay";
import { EntityDisplay } from "@/kraph/displays/EntityDisplay";
import { InstanceDisplay } from "@/kraph/displays/InstanceDisplay";
import { LinkDisplay } from "@/kraph/displays/LinkDisplay";
import { GraphDisplay } from "@/kraph/displays/GraphDisplay";
import { MeasurementDisplay } from "@/kraph/displays/MeasurementDisplay";
import { MetricDisplay } from "@/kraph/displays/MetricDisplay";
import { MetricKindDisplay } from "@/kraph/displays/MetricKindDisplay";
import { NaturalEventDisplay } from "@/kraph/displays/NaturalEventDisplay";
import { NaturalEventCategoryDisplay } from "@/kraph/displays/NaturalEventCategoryDisplay";
import { ProtocolEventDisplay } from "@/kraph/displays/ProtocolEventDisplay";
import { ProtocolEventCategoryDisplay } from "@/kraph/displays/ProtocolEventCategoryDisplay";
import { RelationDisplay } from "@/kraph/displays/RelationDisplay";
import { RelationCategoryDisplay } from "@/kraph/displays/RelationCategoryDisplay";
import { StructureDisplay } from "@/kraph/displays/StructureDisplay";
import { TermDisplay } from "@/kraph/displays/TermDisplay";
import { StructureKindDisplay } from "@/kraph/displays/StructureKindDisplay";
import { StructureRelationCategoryDisplay } from "@/kraph/displays/StructureRelationCategoryDisplay";
import { createDisplayProvider } from "@/lib/display/registry";
import { MessageDisplay } from "@/alpaka/displays/MessageDisplay";
import { SoloBroadcastDisplay } from "@/lovekit/displays/SoloBroadcastDisplay";
import { FolderDisplay } from "@/mikro/displays/FolderDisplay";
import { ArrayDatasetDisplay } from "@/mikro/displays/ArrayDatasetDisplay";
import { FileDisplay } from "@/mikro/displays/FileDisplay";
import { SceneDisplay } from "@/mikro/displays/SceneDisplay";
import { TableDatasetDisplay } from "@/mikro/displays/TableDatasetDisplay";
import { SparseDatasetDisplay } from "@/mikro/displays/SparseDatasetDisplay";

// Import your display components here
// Example:
// import { UserDisplay } from "@/components/displays/UserDisplay";

export const { DisplayProvider, useDisplay, useDisplayComponent } =
  createDisplayProvider({
    // mikro
    "@mikro/file": FileDisplay,
    "@mikro/scene": SceneDisplay,
    "@mikro/arraydataset": ArrayDatasetDisplay,
    "@mikro/folder": FolderDisplay,
    "@mikro/tabledataset": TableDatasetDisplay,
    "@mikro/sparsedataset": SparseDatasetDisplay,
    // elektro
    "@elektro/neuronmodel": NeuronModelDisplay,
    "@elektro/modelworkspace": ModelWorkspaceDisplay,
    // kraph — claims (organization grain, a bare uuid)
    "@kraph/instance": InstanceDisplay,
    "@kraph/link": LinkDisplay,
    // kraph — instances
    "@kraph/graph": GraphDisplay,
    "@kraph/entity": EntityDisplay,
    "@kraph/relation": RelationDisplay,
    "@kraph/measurement": MeasurementDisplay,
    "@kraph/structure": StructureDisplay,
    "@kraph/naturalevent": NaturalEventDisplay,
    "@kraph/protocolevent": ProtocolEventDisplay,
    // kraph — categories
    "@kraph/entitycategory": EntityCategoryDisplay,
    "@kraph/metric": MetricDisplay,
    "@kraph/metrickind": MetricKindDisplay,
    "@kraph/relationcategory": RelationCategoryDisplay,
    "@kraph/structurerelationcategory": StructureRelationCategoryDisplay,
    "@kraph/naturaleventcategory": NaturalEventCategoryDisplay,
    "@kraph/protocoleventcategory": ProtocolEventCategoryDisplay,
    "@kraph/structurekind": StructureKindDisplay,
  "@kraph/term": TermDisplay,
    // kabinet
    "@kabinet/pod": PodDisplay,
    // lovekit
    "@lovekit/solo_broadcast": SoloBroadcastDisplay,
    // alpaka
    "@alpaka/message": MessageDisplay,
  });
