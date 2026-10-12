import * as React from 'react';
import BlokRenderer from '@/core/blok/renderer/BlokRenderer';
import {RekuestAssetHost} from '@/rekuest/scene/RekuestAssetHost';
import {RekuestSceneHost} from '@/rekuest/scene/RekuestSceneHost';
import {BlokTruncationNotice, useBlokDocument} from './blokDocument';

type DemoBlokData = {
  id?: string | null;
  /** Typed `ComponentNode` tree from the Blok fragment. */
  componentTree?: unknown;
  demoState: unknown;
};

type DemoBlokRendererProps = Omit<
  React.ComponentProps<typeof BlokRenderer>,
  'uiComponents' | 'initialState' | 'children'
> & {
  blok: DemoBlokData;
};

/** A blok shown against its demo state is bound to no agent: what it names of one is not there. */
const NO_AGENTS: ReadonlyMap<string, string> = new Map();

export const DemoBlokRenderer = (props: DemoBlokRendererProps) => {
  const {blok, surfaceId, ...rendererProps} = props;
  const {roots, truncatedIds} = useBlokDocument(blok.componentTree as unknown[] | null);

  return (
    <RekuestSceneHost>
     <RekuestAssetHost agents={NO_AGENTS}>
      <BlokRenderer
        {...rendererProps}
        surfaceId={surfaceId ?? `${blok.id ?? 'blok'}-demo`}
        uiComponents={roots}
        initialState={blok.demoState}
      >
        <BlokTruncationNotice truncatedIds={truncatedIds} />
      </BlokRenderer>
     </RekuestAssetHost>
    </RekuestSceneHost>
  );
};

export default DemoBlokRenderer;
