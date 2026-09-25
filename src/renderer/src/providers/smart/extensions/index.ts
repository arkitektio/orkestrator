import {
	ApplicableTalk as AlpakaApplicableTalk,
} from "@/alpaka/smart/sections";
import {
	ObjectButton as SmartObjectButton,
	SmartContext as SmartContextComponent,
} from "@/providers/smart/extensions/context";
import {
	Actions as LocalActions,
	LocalActionCommand as LocalActionCommandComponent,
} from "@/providers/smart/extensions/local/localactions";
import { ApplicableLocalActions as LocalApplicableActions } from "@/providers/smart/extensions/local/sections";
import {
	CreateMeasurementButton as KraphCreateMeasurementButton,
	MeasurementActions as KraphMeasurementActions,
	StructureRelateButton as KraphStructureRelateButton,
} from "@/kraph/smart/relations";
import {
	ApplicableMeasurements as KraphApplicableMeasurements,
	ApplicableRelations as KraphApplicableRelations,
	StructureRelationActions as KraphStructureRelationActions,
} from "@/kraph/smart/sections";
import {
	AssignButton as RekuestAssignButton,
	BatchImplementationAssignButton as RekuestBatchImplementationAssignButton,
	BatchAssignButton as RekuestBatchAssignButton,
	DirectImplementationAssignment as RekuestDirectImplementationAssignment,
	ImplementationAssignButton as RekuestImplementationAssignButton,
} from "@/rekuest/smart/actions";
import {
	ApplicableActions as RekuestApplicableActions,
	ApplicableBatchActions as RekuestApplicableBatchActions,
	ApplicableBatchImplementations as RekuestApplicableBatchImplementations,
	ApplicableImplementations as RekuestApplicableImplementations,
	ApplicableShortcuts as RekuestApplicableShortcuts,
} from "@/rekuest/smart/sections";
import { ShortcutButton as RekuestShortcutButton } from "@/rekuest/smart/shortcuts";
import { InstallButton as KabinetInstallButton } from "@/kabinet/smart/definitions";
import { ApplicableDefinitions as KabinetApplicableDefinitions } from "@/kabinet/smart/sections";
import type {
	ObjectButtonProps as SmartObjectButtonProps,
	OnDone as SmartOnDone,
	OnError as SmartOnError,
	PassDownProps as SmartPassDownProps,
	SmartContextProps as SmartContextPropsType,
} from "./types";

export const ObjectButton = SmartObjectButton;
export const SmartContext = SmartContextComponent;
export const ApplicableTalk = AlpakaApplicableTalk;
export const Actions = LocalActions;
export const ApplicableLocalActions = LocalApplicableActions;
export const LocalActionCommand = LocalActionCommandComponent;
export const ApplicableMeasurements = KraphApplicableMeasurements;
export const ApplicableRelations = KraphApplicableRelations;
export const CreateMeasurementButton = KraphCreateMeasurementButton;
export const MeasurementActions = KraphMeasurementActions;
export const StructureRelateButton = KraphStructureRelateButton;
export const StructureRelationActions = KraphStructureRelationActions;
export const ApplicableActions = RekuestApplicableActions;
export const ApplicableBatchActions = RekuestApplicableBatchActions;
export const ApplicableImplementations = RekuestApplicableImplementations;
export const ApplicableBatchImplementations = RekuestApplicableBatchImplementations;
export const AssignButton = RekuestAssignButton;
export const ImplementationAssignButton = RekuestImplementationAssignButton;
export const BatchAssignButton = RekuestBatchAssignButton;
export const BatchImplementationAssignButton = RekuestBatchImplementationAssignButton;
export const DirectImplementationAssignment = RekuestDirectImplementationAssignment;
export const ApplicableShortcuts = RekuestApplicableShortcuts;
export const ShortcutButton = RekuestShortcutButton;
export const ApplicableDefinitions = KabinetApplicableDefinitions;
export const InstallButton = KabinetInstallButton;

export type ObjectButtonProps = SmartObjectButtonProps;
export type OnDone = SmartOnDone;
export type OnError = SmartOnError;
export type PassDownProps = SmartPassDownProps;
export type SmartContextProps = SmartContextPropsType;
