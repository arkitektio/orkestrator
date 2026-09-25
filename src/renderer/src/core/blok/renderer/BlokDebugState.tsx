import * as React from 'react';
import {useBlokRuntime} from './runtime';

type BlokDebugStateProps = {
  surfaceId: string;
};

const formatState = (state: unknown) => {
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return 'Unable to format state';
  }
};


export const BlokDebugState = ({surfaceId}: BlokDebugStateProps) => {
  const [isOpen, setIsOpen] = React.useState(false);


  const state = useBlokRuntime(state => state.dataModel);
  const formattedState = React.useMemo(() => formatState(state), [state]);

  return (
    <div className="absolute right-3 top-3 z-20 flex max-w-[min(32rem,calc(100%-1.5rem))] flex-col items-end gap-2">
      <button
        className="rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:text-foreground"
        onClick={() => setIsOpen(currentState => !currentState)}
        type="button"
      >
        {isOpen ? 'Hide State' : 'Show State'}
      </button>

      {isOpen && (
        <div className="w-full overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-lg backdrop-blur-sm">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Current State
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{surfaceId}</div>
          </div>

          <pre className="max-h-80 overflow-auto px-4 py-3 text-xs text-foreground">{formattedState}</pre>
        </div>
      )}
    </div>
  );
};

export default BlokDebugState;
