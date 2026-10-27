import * as React from 'react';
import * as z from 'zod';
import {toast} from '@/core/notify';
import {
  BlokPropSchemas,
  createBlokComponent,
  useBlok,
  useBlokRuntime,
  useResolvedProp,
  useValue,
  type BlokComponentNode,
} from '../runtime';
import {isSettledStatus, isTaskStatus, type BlokTaskStatus} from '../runtime/task';

/**
 * `<Toast task={move}>`: a notification when a task settles, once per task
 * (ui@1). Each outcome slot (`done`, `failed`, `cancelled`) is optional and
 * holds the text shown for it:
 *
 *     <Toast task={move}>
 *       <done>Arrived at {move.args.position}</done>
 *       <failed>Move failed: {move.error}</failed>
 *     </Toast>
 *
 * - It is keyed by the task's id: a task toasts at most once.
 * - It fires only for a task that settles while the blok is open, never on
 *   mount for one already settled.
 * - It never fires while the blok shows the past.
 * - It watches only the blok's own `into` records and `task` (the validator
 *   refuses anything else: `toast.task`); there is no imperative toast.
 */

export type BlokToastOutcome = 'done' | 'failed' | 'cancelled';

/** Where a settled task's toast goes; the app's toast island unless a host (a test) says otherwise. */
export type BlokToastSink = (toast: {id: string; outcome: BlokToastOutcome; text: string}) => void;

const islandSink: BlokToastSink = ({id, outcome, text}) => {
  const options = {id: `blok-toast:${id}`};
  if (outcome === 'done') toast.success(text, options);
  else if (outcome === 'failed') toast.error(text, options);
  else toast.info(text, options);
};

export const BlokToastSinkContext = React.createContext<BlokToastSink>(islandSink);

const OUTCOMES: readonly BlokToastOutcome[] = ['done', 'failed', 'cancelled'];
const textSchema = z.unknown();

type Seen = {id: string | null; status: BlokTaskStatus};

const readRecord = (value: unknown): Seen | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as {id?: unknown; status?: unknown};
  if (!isTaskStatus(record.status)) return null;
  return {id: typeof record.id === 'string' ? record.id : null, status: record.status};
};

const slotNode = (component: BlokComponentNode, outcome: BlokToastOutcome): BlokComponentNode | undefined =>
  component.children?.find(child => child.component === outcome);

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const toastSchema = z
  .object({
    task: z.unknown().describe('The task record to follow: an `into` name of this blok (`task={move}`), or `task`.'),
  })
  .describe('A notification when a task settles, once per task: its `done`, `failed` and `cancelled` slots hold the text.');

export const Toast = createBlokComponent(
  {name: 'Toast', acceptsChildren: true, schema: toastSchema},
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const record = readRecord(useValue(blok.task));
    const travelling = useBlokRuntime(state => state.travelAt !== null);
    const sink = React.useContext(BlokToastSinkContext);

    // The slots' text, resolved as the record changes: what a toast says is what the blok knows when it fires.
    const done = slotNode(component, 'done');
    const failed = slotNode(component, 'failed');
    const cancelled = slotNode(component, 'cancelled');
    const texts: Record<BlokToastOutcome, ReturnType<typeof useResolvedProp>> = {
      done: useResolvedProp(done ?? component, done ? 'text' : undefined, textSchema),
      failed: useResolvedProp(failed ?? component, failed ? 'text' : undefined, textSchema),
      cancelled: useResolvedProp(cancelled ?? component, cancelled ? 'text' : undefined, textSchema),
    };

    const last = React.useRef<Seen | null | undefined>(undefined);
    const toasted = React.useRef(new Set<string>());

    React.useEffect(() => {
      const previous = last.current;
      last.current = record;
      // The first look is the state on mount: nothing settles in front of the viewer then.
      if (previous === undefined || !record || travelling) return;
      if (!isSettledStatus(record.status) || !record.id) return;
      if (toasted.current.has(record.id)) return;
      // A task this blok saw before it settled: running then, or (a fast one) not seen with this id yet.
      const sawItRun = previous !== null && (!isSettledStatus(previous.status) || previous.id !== record.id);
      if (!sawItRun) return;
      toasted.current.add(record.id);
      const outcome = record.status as BlokToastOutcome;
      if (!OUTCOMES.includes(outcome)) return;
      if (!slotNode(component, outcome)) return;
      const resolved = texts[outcome];
      sink({id: record.id, outcome, text: resolved.ok ? asText(resolved.value) : ''});
    });

    return null;
  },
);

const outcomeSlot = (name: BlokToastOutcome, description: string) =>
  createBlokComponent(
    {
      name,
      placement: {downstreamOf: ['Toast']},
      schema: z
        .object({text: BlokPropSchemas.DynamicString.optional().describe('What the toast says.')})
        .describe(description),
    },
    () => null,
  );

export const ToastDone = outcomeSlot('done', 'What a `<Toast>` says when its task is done.');
export const ToastFailed = outcomeSlot('failed', 'What a `<Toast>` says when its task failed (`move.error` says why).');
export const ToastCancelled = outcomeSlot('cancelled', 'What a `<Toast>` says when its task was cancelled.');

export const toastBlokComponents = [Toast, ToastDone, ToastFailed, ToastCancelled];
