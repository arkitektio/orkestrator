import type {TopicListener} from '../session/client';
import type {LatestTaskMessage} from './latestTaskStore';

/** One `latest:` topic a test drives: what was watched, and the feed's messages handed in. */
export type FakeLatestFeed = {
  variables: {agent: string; interface: string};
  next: (message: LatestTaskMessage) => void;
  closed: boolean;
};

/** A message of the feed as the session's `latest:` topic carries it. */
const deliver = (listener: TopicListener, message: LatestTaskMessage) => {
  if (message.__typename === 'LatestTaskSnapshot') {
    listener.onResync(
      {
        implementation: message.implementation ?? null,
        latest: message.latest
          ? {id: message.latest.id, is_done: message.latest.isDone, latest_event_kind: message.latest.latestEventKind}
          : null,
        events: message.events.map(event => ({...event})),
      },
      'new',
    );
  } else if (message.__typename === 'TaskChange') {
    listener.onData({create: {id: message.id, is_done: message.isDone, latest_event_kind: message.latestEventKind}});
  } else {
    listener.onData({event: {task: message.task, kind: message.kind, message: message.message, progress: message.progress, returns: message.returns}});
  }
};

/** A stand-in for the window's session that records every `latest:` watch into `feeds`. */
export const fakeLatestSession = (feeds: FakeLatestFeed[]) => ({
  watch: (topic: string, listener: TopicListener) => {
    const [agent, name] = topic.slice('latest:'.length).split('/');
    const feed: FakeLatestFeed = {variables: {agent, interface: name}, next: message => deliver(listener, message), closed: false};
    feeds.push(feed);
    return () => {
      feed.closed = true;
    };
  },
});
