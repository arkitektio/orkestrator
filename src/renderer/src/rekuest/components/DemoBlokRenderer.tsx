import * as React from 'react';
import BlokRenderer from '@/blok/renderer/BlokRenderer';
import {BlokTruncationNotice, useBlokDocument} from './blokDocument';

type DemoBlokData = {
  id?: string | null;
  /** Typed `ComponentNode` tree from the Blok fragment. */
  components: ReadonlyArray<unknown>;
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
  const {roots, truncatedIds} = useBlokDocument(blok.components);

  return (
    <BlokRenderer
      {...rendererProps}
      surfaceId={surfaceId ?? `${blok.id ?? 'blok'}-demo`}
      uiComponents={roots}
      initialState={blok.demoState}
    >
      <BlokTruncationNotice truncatedIds={truncatedIds} />
    </BlokRenderer>
  );
};

export default DemoBlokRenderer;
