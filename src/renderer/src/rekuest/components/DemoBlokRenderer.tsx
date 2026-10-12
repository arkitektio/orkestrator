import * as React from 'react';
import BlokRenderer from '@/core/blok/renderer/BlokRenderer';
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

export const DemoBlokRenderer = (props: DemoBlokRendererProps) => {
  const {blok, surfaceId, ...rendererProps} = props;
  const {roots, truncatedIds} = useBlokDocument(blok.componentTree as unknown[] | null);

  return (
    <RekuestSceneHost>
      <BlokRenderer
        {...rendererProps}
        surfaceId={surfaceId ?? `${blok.id ?? 'blok'}-demo`}
        uiComponents={roots}
        initialState={blok.demoState}
      >
        <BlokTruncationNotice truncatedIds={truncatedIds} />
      </BlokRenderer>
    </RekuestSceneHost>
  );
};

export default DemoBlokRenderer;
