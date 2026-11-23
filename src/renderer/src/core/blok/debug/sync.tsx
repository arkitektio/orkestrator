import * as React from 'react';
import {useBlokRuntimeStoreApi, type BlokRefuseActionHandler} from '@arkitektio/bsx/renderer/runtime/index';
import {getDiagnostics, subscribeDiagnostics} from '@/core/diagnostics/recorder';
import {diffBlokRuntime, type BlokDebugRecorder} from './recorder';

const isBlokLine = (text: string) => text.startsWith('[blok]');

/**
 * Taps the runtime it is mounted in (a child of `BlokRenderer`) for the
 * recorder: hands the sidebar the live store, records every state change, and
 * the window's `[blok]` console warnings and errors while it is open.
 */
export const BlokDebugSync = ({recorder}: {recorder: BlokDebugRecorder}) => {
  const store = useBlokRuntimeStoreApi();

  React.useEffect(() => {
    const detach = recorder.attach(store);
    recorder.record({stream: 'log', title: 'runtime opened', level: 'info'});
    const unsubscribe = store.subscribe((next, previous) => {
      for (const change of diffBlokRuntime(previous, next)) recorder.record(change, {coalesce: true});
    });
    return () => {
      unsubscribe();
      detach();
      recorder.record({stream: 'log', title: 'runtime closed', level: 'info'});
    };
  }, [recorder, store]);

  React.useEffect(() => {
    let seen = Date.now();
    return subscribeDiagnostics(() => {
      const fresh = getDiagnostics().console.filter(line => line.at > seen);
      if (fresh.length === 0) return;
      seen = Math.max(...fresh.map(line => line.at));
      for (const line of fresh) {
        if (!isBlokLine(line.text)) continue;
        recorder.record({stream: 'log', title: line.text, level: line.level, note: 'console (window-wide)'});
      }
    });
  }, [recorder]);

  return null;
};

/**
 * A `refuseAction` that drops every call, as a host that must not act (a
 * logo, a port blok, a preview) passes, telling the recorder why when there is one.
 */
export const refuseEveryAction = (recorder: BlokDebugRecorder | null, why: string): BlokRefuseActionHandler => {
  if (!recorder) return REFUSE;
  return (action, component) => {
    recorder.record({
      stream: 'out',
      title: `call ${action.dependency}.${action.operation}`,
      note: `refused: ${why}`,
      level: 'warn',
      detail: {action, component: component.id},
    });
    return true;
  };
};

const REFUSE: BlokRefuseActionHandler = () => true;
