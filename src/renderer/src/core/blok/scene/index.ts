import type {BlokCatalogImplementation, BlokComponentDefinition} from '@arkitektio/bsx/runtime';
import {SceneRender} from './Scene';
import {runRenders} from './Space';

/**
 * The 3D surface is the app's: the canvas, camera, grid, cards and view
 * controls of a `Scene` (`Scene.tsx`), and the room of a `Space` with what it
 * places and routes (`Space.tsx`). The package still owns the contract (the
 * schemas), the scene store, and what stands in a scene (models, bindings).
 */
const APP_RENDERS: Record<string, BlokComponentDefinition['render']> = {
  Scene: SceneRender as BlokComponentDefinition['render'],
  Space: runRenders.Space as BlokComponentDefinition['render'],
  Placed: runRenders.Placed as BlokComponentDefinition['render'],
  Route: runRenders.Route as BlokComponentDefinition['render'],
};

/** The scene family as the package draws it, with the app's own surface. */
export const withAppScene = (implementation: BlokCatalogImplementation): BlokCatalogImplementation => ({
  ...implementation,
  components: implementation.components.map(component =>
    APP_RENDERS[component.name] ? {...component, render: APP_RENDERS[component.name]} : component,
  ),
});
