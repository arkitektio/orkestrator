import * as React from 'react';
import {ArrowDownLeft, ArrowUpRight, Database, Pause, Play, ScrollText, Trash2} from 'lucide-react';
import type {BlokRuntimeStore} from '@arkitektio/bsx/renderer/runtime/index';
import {Button} from '@/core/ui/button';
import {CopyButton} from '@/core/ui/copy-button';
import {Input} from '@/core/ui/input';
import {cn} from '@/core/util/utils';
import {useBlokDebugSnapshot, type BlokDebugEntry, type BlokDebugRecorder, type BlokDebugStream} from './recorder';

const STREAMS: ReadonlyArray<{stream: BlokDebugStream; label: string; icon: typeof ArrowUpRight; hint: string}> = [
  {stream: 'out', label: 'Out', icon: ArrowUpRight, hint: 'Agent calls and the other commands the blok sends'},
  {stream: 'in', label: 'In', icon: ArrowDownLeft, hint: 'Task events and agent states coming back'},
  {stream: 'state', label: 'State', icon: Database, hint: 'Writes to the runtime and source status changes'},
  {stream: 'log', label: 'Logs', icon: ScrollText, hint: 'Task log lines, blok console warnings and lifecycle'},
];

const ICONS = Object.fromEntries(STREAMS.map(each => [each.stream, each.icon])) as Record<BlokDebugStream, typeof ArrowUpRight>;

/** JSON that survives cycles, functions and huge values, for display only. */
export const debugJson = (value: unknown, limit = 20_000): string => {
  if (value === undefined) return 'undefined';
  const seen = new WeakSet<object>();
  let text: string;
  try {
    text =
      JSON.stringify(
        value,
        (_key, item: unknown) => {
          if (typeof item === 'function') return `ƒ ${item.name || 'anonymous'}`;
          if (typeof item === 'bigint') return `${item}n`;
          if (item instanceof Error) return {name: item.name, message: item.message};
          if (item && typeof item === 'object') {
            if (seen.has(item)) return '[circular]';
            seen.add(item);
          }
          return item;
        },
        2,
      ) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > limit ? `${text.slice(0, limit)}\n… ${text.length - limit} more characters` : text;
};

const timeOf = (at: number) => {
  const date = new Date(at);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const EntryRow = React.memo(({entry, enter}: {entry: BlokDebugEntry; enter: boolean}) => {
  const [open, setOpen] = React.useState(false);
  // Read once: a row animates in when it arrives, not again on a later render.
  const [entering] = React.useState(enter);
  const Icon = ICONS[entry.stream];
  const hasDetail = entry.detail !== undefined;
  return (
    <div
      className={cn('grid border-b border-border/50 last:border-b-0', entering && 'animate-[debug-row-open_220ms_cubic-bezier(0.2,0.8,0.2,1)]')}
      style={{gridTemplateRows: '1fr'}}
    >
     <div className={cn('relative min-h-0 overflow-hidden', entering && 'animate-[debug-row-drop_260ms_cubic-bezier(0.2,0.8,0.2,1)_backwards]')}>
      {/* A repeated write folded into this row flashes it, so a busy path is seen to move. */}
      {entry.count > 1 && (
        <span
          key={entry.count}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-primary/10 animate-[task-pulse_600ms_ease-out_forwards]"
        />
      )}
      <button
        type="button"
        className={cn('flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-muted/50', hasDetail ? 'cursor-pointer' : 'cursor-default')}
        onClick={() => hasDetail && setOpen(value => !value)}
      >
        <Icon
          className={cn(
            'mt-0.5 size-3.5 shrink-0',
            entry.level === 'error' ? 'text-destructive' : entry.level === 'warn' ? 'text-warning' : entry.stream === 'out' ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate font-mono text-xs',
                entry.level === 'error' && 'text-destructive',
                entry.level === 'warn' && 'text-warning',
              )}
              title={entry.title}
            >
              {entry.title}
            </span>
            {entry.count > 1 && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">×{entry.count}</span>}
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{timeOf(entry.at)}</span>
          </div>
          {entry.note && <span className="truncate text-xs text-muted-foreground" title={entry.note}>{entry.note}</span>}
        </div>
      </button>
      {open && hasDetail && <JsonBlock value={entry.detail} />}
     </div>
    </div>
  );
});
EntryRow.displayName = 'EntryRow';

const JsonBlock = ({value, className}: {value: unknown; className?: string}) => {
  const text = React.useMemo(() => debugJson(value), [value]);
  return (
    <div className={cn('group relative mx-3 mb-2 rounded bg-muted/50', className)}>
      <CopyButton value={text} title="Copy value" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100" />
      <pre className="overflow-x-auto p-2 font-mono text-[11px] leading-snug whitespace-pre">{text}</pre>
    </div>
  );
};

/** The runtime's state, re-read at most a few times a second: a streamed agent state must not re-render the sidebar every frame. */
const useThrottledRuntime = (runtime: BlokRuntimeStore | null, ms = 250) => {
  const [state, setState] = React.useState(() => runtime?.getState() ?? null);
  React.useEffect(() => {
    if (!runtime) {
      setState(null);
      return;
    }
    setState(runtime.getState());
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = runtime.subscribe(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setState(runtime.getState());
      }, ms);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [ms, runtime]);
  return state;
};

const StateSection = ({title, value, defaultOpen}: {title: string; value: unknown; defaultOpen?: boolean}) => (
  <details open={defaultOpen} className="border-b border-border/50 last:border-b-0">
    <summary className="cursor-pointer px-3 py-1.5 font-mono text-xs hover:bg-muted/50">{title}</summary>
    <JsonBlock value={value} />
  </details>
);

const LiveState = ({runtime}: {runtime: BlokRuntimeStore | null}) => {
  const state = useThrottledRuntime(runtime);
  if (!state) return <p className="px-3 py-4 text-xs text-muted-foreground">No runtime is open.</p>;
  const model = (state.dataModel ?? {}) as Record<string, unknown>;
  const pending = Object.entries(state.statuses).filter(([, status]) => status.status !== 'ready');
  return (
    <div className="flex flex-col">
      {state.travelAt && <p className="px-3 py-1.5 text-xs text-warning">Showing {state.travelAt}: commands are off.</p>}
      {Object.keys(model)
        .sort()
        .map(key => (
          <StateSection key={key} title={key} value={model[key]} />
        ))}
      <StateSection title={`statuses (${pending.length} not ready)`} value={state.statuses} />
      <StateSection title="written at runtime" value={state.runtimePathValues} />
      {state.unavailableDependencies.size > 0 && (
        <StateSection title="unavailable dependencies" value={Object.fromEntries(state.unavailableDependencies)} />
      )}
      {state.lockedActions.size > 0 && <StateSection title="locked actions" value={Object.fromEntries(state.lockedActions)} />}
    </div>
  );
};

/**
 * One blok, debugged: what it sent and got back, how its state moved and what
 * it logged, newest first, and its state as it is now.
 */
export const BlokDebugPanel = ({recorder}: {recorder: BlokDebugRecorder}) => {
  const snapshot = useBlokDebugSnapshot(recorder);
  const [view, setView] = React.useState<'events' | 'state'>('events');
  const [shown, setShown] = React.useState<ReadonlySet<BlokDebugStream>>(() => new Set(STREAMS.map(each => each.stream)));
  const [filter, setFilter] = React.useState('');
  // The newest entry already drawn: only rows after it animate in. What was
  // there when the panel opened, or shows again when a filter is lifted, does not.
  const lastSeq = snapshot.entries[snapshot.entries.length - 1]?.seq ?? 0;
  const drawn = React.useRef(lastSeq);
  const seenBefore = drawn.current;
  React.useEffect(() => {
    drawn.current = Math.max(drawn.current, lastSeq);
  }, [lastSeq]);

  const entries = React.useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return snapshot.entries
      .filter(entry => shown.has(entry.stream))
      .filter(entry => !needle || entry.title.toLowerCase().includes(needle) || entry.note?.toLowerCase().includes(needle))
      .reverse();
  }, [filter, shown, snapshot.entries]);

  const counts = React.useMemo(() => {
    const byStream: Record<BlokDebugStream, number> = {out: 0, in: 0, state: 0, log: 0};
    for (const entry of snapshot.entries) byStream[entry.stream] += 1;
    return byStream;
  }, [snapshot.entries]);

  const toggle = (stream: BlokDebugStream) =>
    setShown(current => {
      const next = new Set(current);
      if (next.has(stream)) next.delete(stream);
      else next.add(stream);
      return next;
    });

  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {(['events', 'state'] as const).map(each => (
          <Button key={each} size="sm" variant={view === each ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setView(each)}>
            {each === 'events' ? 'Events' : 'Live state'}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={snapshot.paused ? 'Record again' : 'Pause recording'}
            onClick={() => recorder.setPaused(!snapshot.paused)}
          >
            {snapshot.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="size-7" title="Clear" onClick={recorder.clear}>
            <Trash2 className="size-3.5" />
          </Button>
          <CopyButton value={() => debugJson(snapshot.entries, Infinity)} title="Copy every event as JSON" className="size-7" />
        </div>
      </div>

      {view === 'events' ? (
        <>
          <div className="flex flex-col gap-1.5 border-b px-2 py-1.5">
            <div className="flex flex-wrap gap-1">
              {STREAMS.map(({stream, label, icon: Icon, hint}) => (
                <Button
                  key={stream}
                  size="sm"
                  variant={shown.has(stream) ? 'secondary' : 'ghost'}
                  className={cn('h-6 gap-1 px-2 text-xs', !shown.has(stream) && 'text-muted-foreground')}
                  title={hint}
                  onClick={() => toggle(stream)}
                >
                  <Icon className="size-3" />
                  {label}
                  <span className="font-mono text-[10px] text-muted-foreground">{counts[stream]}</span>
                </Button>
              ))}
            </div>
            <Input
              value={filter}
              onChange={event => setFilter(event.target.value)}
              placeholder="Filter by path, action or message"
              className="h-7 text-xs"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {snapshot.paused ? 'Paused: nothing is recorded.' : 'Nothing yet. Use the blok and what it sends, receives and writes shows here.'}
              </p>
            ) : (
              entries.map(entry => <EntryRow key={entry.seq} entry={entry} enter={entry.seq > seenBefore} />)
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LiveState runtime={snapshot.runtime} />
        </div>
      )}
    </div>
  );
};

export default BlokDebugPanel;
