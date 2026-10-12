import {AnimateBlok, AttachBlok, BeamBlok, GlowBlok, MoveBlok, RotateBlok, ShowBlok, TintBlok} from './bindings';
import {OnClickBlok, PopoutBlok} from './interaction';
import {ModelBlok, RobotBlok} from './Model';
import {SceneBlok} from './Scene';

export {useSceneNotice, useSceneOverlay} from './context';
export {SceneSurface} from './Scene';

export * from './host';

/**
 * The 3D vocabulary: three containers place models, eight children bind their
 * named nodes to state, and two handle interaction and HTML.
 */
export const sceneBlokComponents = [
  SceneBlok,
  ModelBlok,
  RobotBlok,
  MoveBlok,
  RotateBlok,
  AnimateBlok,
  ShowBlok,
  GlowBlok,
  TintBlok,
  AttachBlok,
  BeamBlok,
  OnClickBlok,
  PopoutBlok,
];
