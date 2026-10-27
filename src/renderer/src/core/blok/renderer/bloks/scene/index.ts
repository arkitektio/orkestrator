import {AnimateBlok, AttachBlok, BeamBlok, GlowBlok, MoveBlok, RotateBlok, VisibleBlok, TintBlok} from './bindings';
import {OnClickBlok, PopoutBlok} from './interaction';
import {ModelBlok, RobotBlok} from './Model';
import {SceneBlok} from './Scene';
import {TransformBlok} from './Transform';

export {SceneOwnerProvider, useSceneNotice, useSceneOverlay} from './context';
export {SceneSurface} from './Scene';

export * from './host';

/**
 * The 3D vocabulary: three containers place models, a transform places what
 * it holds (and lets a gizmo move it), eight children bind their named nodes
 * to state, and two handle interaction and HTML.
 */
export const sceneBlokComponents = [
  SceneBlok,
  ModelBlok,
  RobotBlok,
  TransformBlok,
  MoveBlok,
  RotateBlok,
  AnimateBlok,
  VisibleBlok,
  GlowBlok,
  TintBlok,
  AttachBlok,
  BeamBlok,
  OnClickBlok,
  PopoutBlok,
];
