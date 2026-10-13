import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  parseAsInteger,
  parseAsIsoDateTime,
  parseAsString,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";
import { useRekuestTravelSource } from "./context";
import type { TravelClock, TravelSource } from "./travelSource";

/** A moment this close to the present is the present: letting go of the slider there goes live. */
export const LIVE_EDGE_MS = 2000;

/** Along the clock, or one revision of one agent at a time. */
export type TravelMode = "time" | "revisions";

/**
 * A page's hold on travelling back: whether its History bar is open, whether
 * it shows the past, and the moves of the clock. Where it stands lives in the
 * URL, so a checkout can be linked and survives a reload: the moment (`?at=`),
 * or the revision of one agent's session (`?rev=&agent=&session=`).
 */
export type BlokTravel = {
  /** The source while the past is shown, `null` while live. Hand it to `BlokTravelProvider`. */
  source: TravelSource | null;
  open: boolean;
  /** Opens the bar, or closes it — which always goes back to live: a past nobody can see is a trap. */
  toggle: () => void;
  travelling: boolean;
  clock: TravelClock;
  mode: TravelMode;
  /** The agent whose revisions are stepped in `revisions` mode. */
  revisionAgent: string | null;
  /**
   * `revisions` steps through the revisions of `agentId`, from the one it is
   * at at the moment shown; `time` goes back to the clock, at the moment of
   * the revision shown. Neither moves what is shown.
   */
  setMode: (mode: TravelMode, agentId?: string) => void;
  /** Lands on one revision of the session the agent is stepped in (from live: of its latest). */
  checkoutRevision: (revision: number) => void;
  /** While the revision slider is dragged: moves the revision, asks sparingly, leaves the URL alone. */
  scrubRevision: (revision: number) => void;
  /** While the slider is dragged: moves the clock, asks sparingly, leaves the URL alone. */
  scrub: (at: number) => void;
  /** The slider let go, or a time picked: lands on the moment and writes it to the URL. */
  commit: (at: number) => void;
  step: (direction: -1 | 1) => void;
  play: () => void;
  pause: () => void;
  setRate: (rate: number) => void;
  goLive: () => void;
};

type UrlPosition = {
  at: number | null;
  revision: number | null;
  agent: string | null;
  session: string | null;
};

const LIVE: UrlPosition = { at: null, revision: null, agent: null, session: null };

const keyOf = (position: UrlPosition): string =>
  [position.at, position.revision, position.agent, position.session].join("|");

/** The controller on a given source. `useBlokTravel` is this on rekuest's own. */
export const useTravelController = (source: TravelSource): BlokTravel => {
  const [atParam, setAtParam] = useQueryState("at", parseAsIsoDateTime);
  const [urlRevision, setRevisionParam] = useQueryState("rev", parseAsInteger);
  const [urlAgent, setAgentParam] = useQueryState("agent", parseAsString);
  const [urlSession, setSessionParam] = useQueryState("session", parseAsString);
  // A number, never the Date: the parser hands out a new one on every render.
  const urlAt = atParam ? atParam.getTime() : null;
  // A revision says nothing without its agent.
  const urlPinned = urlRevision !== null && urlAgent !== null;
  const inPast = urlAt !== null || urlPinned;

  const [travelling, setTravelling] = useState(inPast);
  const [open, setOpen] = useState(inPast);
  const [mode, setModeState] = useState<TravelMode>(urlPinned ? "revisions" : "time");
  const [revisionAgent, setRevisionAgent] = useState<string | null>(urlPinned ? urlAgent : null);
  const clock = useSyncExternalStore(source.subscribe, source.getClock, source.getClock);

  const dragging = useRef(false);
  const isTravelling = useLatestRef(travelling);
  const currentMode = useLatestRef(mode);
  const currentAgent = useLatestRef(revisionAgent);
  /** What this controller last wrote to the URL: reading it back must not move the clock again. */
  const written = useRef<string | null>(null);
  const writeUrl = useLatestRef((position: UrlPosition) => {
    written.current = keyOf(position);
    setAtParam(position.at === null ? null : new Date(position.at));
    setRevisionParam(position.revision);
    setAgentParam(position.agent);
    setSessionParam(position.session);
  });

  // The URL moves the clock: on mount, and when a link or Back changes it. A
  // layout effect, so the clock stands on the moment before any blok below
  // starts to watch the source.
  useLayoutEffect(() => {
    const url: UrlPosition = urlPinned
      ? { at: null, revision: urlRevision, agent: urlAgent, session: urlSession }
      : { ...LIVE, at: urlAt };
    // Its own write read back: the clock already stands there, and may have moved on since.
    const own = written.current === keyOf(url);
    written.current = null;

    if (!inPast) {
      if (isTravelling.current) {
        source.pause();
        setTravelling(false);
      }
      return;
    }
    if (urlPinned) {
      const standing = source.getClock().revision;
      if (
        !own &&
        (standing?.agentId !== urlAgent ||
          standing.revision !== urlRevision ||
          (urlSession !== null && standing.sessionId !== urlSession))
      ) {
        source.seekRevision(urlAgent, { revision: urlRevision, sessionId: urlSession });
      }
      setModeState("revisions");
      setRevisionAgent(urlAgent);
    } else if (!own && urlAt !== null && source.getClock().at !== urlAt) source.seek(urlAt, true);
    setTravelling(true);
    setOpen(true);
  }, [inPast, isTravelling, source, urlAgent, urlAt, urlPinned, urlRevision, urlSession]);

  // The clock moves the URL once it has come to rest (a step, a pause): never
  // while it plays or is dragged, which would be a router commit per frame.
  useEffect(() => {
    if (!travelling || clock.playing || dragging.current) return;
    const standing = source.getClock().revision;
    if (standing !== null) {
      // Not before the answer has said which revision of which session this is.
      if (standing.revision === null || clock.phase !== "ready") return;
      if (urlRevision !== standing.revision || urlAgent !== standing.agentId || urlSession !== standing.sessionId || urlAt !== null) {
        writeUrl.current({ at: null, revision: standing.revision, agent: standing.agentId, session: standing.sessionId });
      }
      return;
    }
    const at = source.getClock().at;
    if (at !== urlAt || urlRevision !== null) writeUrl.current({ ...LIVE, at });
  }, [clock.at, clock.phase, clock.playing, clock.revision, source, travelling, urlAgent, urlAt, urlRevision, urlSession, writeUrl]);

  const goLive = useCallback(() => {
    dragging.current = false;
    source.pause();
    setTravelling(false);
    writeUrl.current(LIVE);
  }, [source, writeUrl]);

  const scrub = useCallback(
    (at: number) => {
      dragging.current = true;
      source.seek(at);
      setModeState("time");
      setTravelling(true);
    },
    [source],
  );

  const commit = useCallback(
    (at: number) => {
      dragging.current = false;
      if (at >= Date.now() - LIVE_EDGE_MS) {
        goLive();
        return;
      }
      source.seek(at, true);
      setModeState("time");
      setTravelling(true);
      writeUrl.current({ ...LIVE, at: source.getClock().at });
    },
    [goLive, source, writeUrl],
  );

  const setMode = useCallback(
    (next: TravelMode, agentId?: string) => {
      const agent = agentId ?? currentAgent.current;
      if (next === "revisions" && agent === null) return;
      setModeState(next);
      if (next === "revisions") setRevisionAgent(agent);
      // Live stays live: the first step is what leaves it.
      if (!isTravelling.current) return;
      if (next === "revisions" && agent !== null) source.seekRevision(agent);
      else if (source.getClock().revision !== null) source.seek(source.getClock().at, true);
    },
    [currentAgent, isTravelling, source],
  );

  const checkoutRevision = useCallback(
    (revision: number) => {
      const agent = currentAgent.current;
      if (agent === null || !Number.isFinite(revision)) return;
      dragging.current = false;
      const position = { revision: Math.max(0, Math.round(revision)) };
      // From live it is the agent's latest session, not the one that was stepped before going live.
      source.seekRevision(agent, isTravelling.current ? position : { ...position, sessionId: null });
      setTravelling(true);
      // A slider let go where the clock already stands moves nothing that would write the URL.
      const { phase, revision: standing } = source.getClock();
      if (phase === "ready" && standing !== null && standing.revision !== null) {
        writeUrl.current({ at: null, revision: standing.revision, agent: standing.agentId, session: standing.sessionId });
      }
    },
    [currentAgent, isTravelling, source, writeUrl],
  );

  const scrubRevision = useCallback(
    (revision: number) => {
      const agent = currentAgent.current;
      if (agent === null || !isTravelling.current) return;
      dragging.current = true;
      source.seekRevision(agent, { revision: Math.max(0, Math.round(revision)) }, false);
    },
    [currentAgent, isTravelling, source],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      // From live, the first step back starts at the present.
      if (!isTravelling.current) {
        const agent = currentMode.current === "revisions" ? currentAgent.current : null;
        source.seek(Date.now(), agent === null);
        if (agent !== null) source.seekRevision(agent);
        setTravelling(true);
      }
      source.step(direction);
    },
    [currentAgent, currentMode, isTravelling, source],
  );

  const play = useCallback(() => {
    if (!isTravelling.current) return;
    setModeState("time");
    source.play();
  }, [isTravelling, source]);
  const pause = useCallback(() => source.pause(), [source]);
  const setRate = useCallback((rate: number) => source.setRate(rate), [source]);

  const toggle = useCallback(() => {
    if (open && isTravelling.current) goLive();
    setOpen(!open);
  }, [goLive, isTravelling, open]);

  return useMemo(
    () => ({
      source: travelling ? source : null,
      open,
      toggle,
      travelling,
      clock,
      mode,
      revisionAgent,
      setMode,
      checkoutRevision,
      scrubRevision,
      scrub,
      commit,
      step,
      play,
      pause,
      setRate,
      goLive,
    }),
    [checkoutRevision, scrubRevision, clock, commit, goLive, mode, open, pause, play, revisionAgent, scrub, setMode, setRate, source, step, toggle, travelling],
  );
};

/** Travelling back through the state of rekuest agents, for one page. */
export const useBlokTravel = (): BlokTravel => {
  const goLive = useRef<() => void>(() => {});
  const source = useRekuestTravelSource({ onReachedLive: () => goLive.current() });
  const travel = useTravelController(source);
  useLayoutEffect(() => {
    goLive.current = travel.goLive;
  });
  return travel;
};
