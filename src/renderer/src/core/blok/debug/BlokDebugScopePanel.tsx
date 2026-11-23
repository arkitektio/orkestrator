import * as React from 'react';
import {cn} from '@/core/util/utils';
import {BlokDebugPanel} from './BlokDebugPanel';
import {useThrottledStore} from './recorder';
import type {BlokDebugItem, BlokDebugScope} from './registry';

const ItemRow = ({item, selected, onSelect}: {item: BlokDebugItem; selected: boolean; onSelect: () => void}) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn('flex w-full items-center gap-2 px-3 py-1 text-left text-xs hover:bg-muted/50', selected && 'bg-muted')}
    title={item.key}
  >
    <span
      className={cn('size-1.5 shrink-0 rounded-full', item.mounts > 0 ? 'bg-success' : 'border border-muted-foreground/60')}
      title={item.mounts > 0 ? 'Open' : 'Closed'}
    />
    <span className="shrink-0 rounded bg-primary/10 px-1 font-mono text-[10px] text-primary">{item.kind}</span>
    <span className={cn('min-w-0 flex-1 truncate', item.mounts === 0 && 'text-muted-foreground')}>{item.label}</span>
    {item.mounts > 1 && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">×{item.mounts}</span>}
  </button>
);

/**
 * The bloks of a scope (a page's, or the window's), and the one picked,
 * debugged. Open ones come first; a closed one stays readable for a while, so
 * a dialog's blok can be looked at once the dialog is gone.
 */
export const BlokDebugScopePanel = ({scope, className}: {scope: BlokDebugScope; className?: string}) => {
  const items = useThrottledStore(scope.subscribe, scope.getSnapshot, 250);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<string | null>(null);
  const kinds = React.useMemo(() => [...new Set(items.map(item => item.kind))].sort(), [items]);
  const listed = kind ? items.filter(item => item.kind === kind) : items;
  // Until one is picked (or once the picked one is gone): the newest open one.
  const selected = items.find(item => item.key === picked) ?? listed[0] ?? null;

  if (items.length === 0) {
    return <p className={cn('px-3 py-4 text-xs text-muted-foreground', className)}>No blok has been drawn here since debug mode was turned on.</p>;
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
          {[null, ...kinds].map(each => (
            <button
              key={each ?? 'all'}
              type="button"
              onClick={() => setKind(each)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px]',
                kind === each ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              {each ?? 'all'}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-40 shrink-0 overflow-y-auto border-b py-1">
        {listed.map(item => (
          <ItemRow key={item.key} item={item} selected={item.key === selected?.key} onSelect={() => setPicked(item.key)} />
        ))}
      </div>
      <div className="min-h-0 flex-1">{selected && <BlokDebugPanel key={selected.key} recorder={selected.recorder} />}</div>
    </div>
  );
};

export default BlokDebugScopePanel;
