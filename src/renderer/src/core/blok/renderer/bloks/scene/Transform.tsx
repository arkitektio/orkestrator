import * as React from 'react';
import * as THREE from 'three';
import * as z from 'zod';
import {TransformControls} from '@react-three/drei';
import {fromMatrix4, toMatrix4} from '@/core/model/affine';
import {createBlokComponent, useBinding, useBlok, useValue, type BlokRenderArgs} from '../../runtime';
import {bindSchema} from '../shared/schemas';
import {useBlokSceneInert, useBlokSceneStill} from './host';

const transformSchema = z
  .object({
    matrix: z
      .unknown()
      .optional()
      .describe(
        'Where the children stand: a 4x4 affine matrix as four rows, in meters with Y up (as a space placement keeps it). The identity when absent or malformed.',
      ),
    bind: bindSchema.describe(
      'Data-model path of the matrix: read in place of `matrix`, and written by the gizmo. Bound to a persisted local, the pose stays on this device between openings.',
    ),
    gizmo: z.boolean().optional().describe('Whether a gizmo moves the children. Defaults to true when bound; never shown while viewing the past.'),
    mode: z.enum(['translate', 'rotate', 'scale']).optional().describe('What the gizmo does: "translate" (the default), "rotate" or "scale".'),
    size: z.number().optional().describe('The size of the gizmo on screen. Defaults to 0.7.'),
  })
  .describe(
    'Places its children by an affine matrix. Bound (`bind="pose"`), a gizmo moves them and writes the matrix back, e.g. to a local the blok persists.',
  );

type TransformRenderArgs = BlokRenderArgs<typeof transformSchema>;

const sameMatrix = (a: THREE.Matrix4, b: THREE.Matrix4): boolean => a.equals(b);

const TransformBody = ({component, buildChild}: Pick<TransformRenderArgs, 'component' | 'buildChild'>) => {
  const blok = useBlok(component, transformSchema);
  const bind = useValue(blok.bind);
  const binding = useBinding(bind);
  const declared = useValue(blok.matrix);
  const gizmo = useValue(blok.gizmo);
  const mode = useValue(blok.mode) ?? 'translate';
  const size = useValue(blok.size) ?? 0.7;
  const inert = useBlokSceneInert();
  const still = useBlokSceneStill();

  const source = binding && binding.value != null ? binding.value : declared;
  const sourceKey = JSON.stringify(source ?? null);
  // Keyed by value: a data model rebuilt around the same matrix moves nothing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matrix = React.useMemo(() => toMatrix4(source), [sourceKey]);

  const [group, setGroup] = React.useState<THREE.Group | null>(null);
  const dragging = React.useRef(false);
  React.useLayoutEffect(() => {
    // While the gizmo holds the group it is the gizmo's; the write on release brings the matrix back.
    if (!group || dragging.current) return;
    matrix.decompose(group.position, group.quaternion, group.scale);
  }, [group, matrix]);

  const showGizmo = Boolean(binding) && (gizmo ?? true) && !inert && !still;

  return (
    <>
      <group ref={setGroup}>
        {(component.children ?? []).map(child => (
          <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
        ))}
      </group>
      {showGizmo && group && binding ? (
        <TransformControls
          object={group}
          mode={mode}
          size={size}
          onMouseDown={() => {
            dragging.current = true;
          }}
          onMouseUp={() => {
            dragging.current = false;
            group.updateMatrix();
            // A click on the gizmo that moved nothing has nothing to write.
            if (!sameMatrix(group.matrix, matrix)) binding.setValue(fromMatrix4(group.matrix));
          }}
        />
      ) : null}
    </>
  );
};

export const TransformBlok = createBlokComponent(
  {
    name: 'Transform',
    acceptsChildren: true,
    placement: {context: 'scene', downstreamOf: ['Scene']},
    schema: transformSchema,
  },
  ({component, buildChild}) => <TransformBody component={component} buildChild={buildChild} />,
);
