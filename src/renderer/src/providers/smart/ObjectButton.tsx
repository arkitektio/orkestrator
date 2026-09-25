import {
  Actions as SmartActions,
  ApplicableActions as SmartApplicableActions,
  ApplicableBatchActions as SmartApplicableBatchActions,
  ApplicableDefinitions as SmartApplicableDefinitions,
  ApplicableLocalActions as SmartApplicableLocalActions,
  ApplicableMeasurements as SmartApplicableMeasurements,
  ApplicableRelations as SmartApplicableRelations,
  ApplicableShortcuts as SmartApplicableShortcuts,
  AssignButton as SmartAssignButton,
  BatchAssignButton as SmartBatchAssignButton,
  CreateMeasurementButton as SmartCreateMeasurementButton,
  DirectImplementationAssignment as SmartDirectImplementationAssignment,
  InstallButton as SmartInstallButton,
  LocalActionCommand as SmartLocalActionCommand,
  MeasurementActions as SmartMeasurementActions,
  ObjectButton as SmartObjectButton,
  ShortcutButton as SmartShortcutButton,
  SmartContext as SmartContextComponent,
  StructureRelateButton as SmartStructureRelateButton,
  StructureRelationActions as SmartStructureRelationActions,
} from "@/providers/smart/extensions";
import type {
  ObjectButtonProps as SmartObjectButtonProps,
  OnDone as SmartOnDone,
  OnError as SmartOnError,
  PassDownProps as SmartPassDownProps,
  SmartContextProps as SmartContextPropsType,
} from "@/providers/smart/extensions/types";

export type OnDone = SmartOnDone;
export type onError = SmartOnError;
export type SmartContextProps = SmartContextPropsType;
export type ObjectButtonProps = SmartObjectButtonProps;
export type PassDownProps = SmartPassDownProps;

export const DirectImplementationAssignment = SmartDirectImplementationAssignment;
export const AssignButton = SmartAssignButton;
export const BatchAssignButton = SmartBatchAssignButton;
export const ShortcutButton = SmartShortcutButton;
export const InstallButton = SmartInstallButton;
export const ApplicableBatchActions = SmartApplicableBatchActions;
export const ApplicableActions = SmartApplicableActions;
export const ApplicableShortcuts = SmartApplicableShortcuts;
export const ApplicableDefinitions = SmartApplicableDefinitions;
export const StructureRelationActions = SmartStructureRelationActions;
export const MeasurementActions = SmartMeasurementActions;
export const ApplicableRelations = SmartApplicableRelations;
export const ApplicableMeasurements = SmartApplicableMeasurements;
export const StructureRelateButton = SmartStructureRelateButton;
export const CreateMeasurementButton = SmartCreateMeasurementButton;
export const LocalActionCommand = SmartLocalActionCommand;
export const Actions = SmartActions;
export const ApplicableLocalActions = SmartApplicableLocalActions;
export const ObjectButton = SmartObjectButton;
export const SmartContext = SmartContextComponent;
