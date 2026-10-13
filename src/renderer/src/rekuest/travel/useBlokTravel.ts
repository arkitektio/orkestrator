import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { parseAsIsoDateTime, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";
import { useRekuestTravelSource } from "./context";
import type { TravelClock, TravelSource } from "./travelSource";

/** A moment this close to the present is the present: letting go of the slider there goes live. */
export const LIVE_EDGE_MS = 2000;

/**
 * A page's hold on travelling back: whether its History bar is open, whether
 * it shows the past, and the moves of the clock. The moment lives in the URL
 * (`?at=`), so a checkout can be linked and survives a reload.
 */
export type BlokTravel = {
  /** The source while the past is shown, `null` while live. Hand it to `BlokTravelProvider`. */
  source: TravelSource | null;
  open: boolean;
  /** Opens the bar, or closes it — which always goes back to live: a past nobody can see is a trap. */
  toggle: () => void;
  travelling: boolean;
  clock: TravelClock;
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

/** The controller on a given source. `useBlokTravel` is this on rekuest's own. */
export const useTravelController = (source: TravelSource): BlokTravel => {
  const [atParam, setAtParam] = useQueryState("at", parseAsIsoDateTime);
  // A number, never the Date: the parser hands out a new one on every render.
  const urlAt = atParam ? atParam.getTime() : null;

  const [travelling, setTravelling] = useState(urlAt !== null);
  const [open, setOpen] = useState(urlAt !== null);
  const clock = useSyncExternalStore(source.subscribe, source.getClock, source.getClock);

  const dragging = useRef(false);
  const writeUrl = useLatestRef(setAtParam);
  const isTravelling = useLatestRef(travelling);

  // The URL moves the clock: on mount, and when a link or Back changes it. A
  // layout effect, so the clock stands on the moment before any blok below
  // starts to watch the source.
  useLayoutEffect(() => {
    if (urlAt === null) {
      if (isTravelling.current) {
        source.pause();
        setTravelling(false);
      }
      return;
    }
    if (source.getClock().at !== urlAt) source.seek(urlAt, true);
    setTravelling(true);
    setOpen(true);
  }, [isTravelling, source, urlAt]);

  // The clock moves the URL once it has come to rest (a step, a pause): never
  // while it plays or is dragged, which would be a router commit per frame.
  useEffect(() => {
    if (!travelling || clock.playing || dragging.current) return;
    const at = source.getClock().at;
    if (at !== urlAt) writeUrl.current(new Date(at));
  }, [clock.at, clock.playing, source, travelling, urlAt, writeUrl]);

  const goLive = useCallback(() => {
    dragging.current = false;
    source.pause();
    setTravelling(false);
    writeUrl.current(null);
  }, [source, writeUrl]);

  const scrub = useCallback(
    (at: number) => {
      dragging.current = true;
      source.seek(at);
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
      setTravelling(true);
      writeUrl.current(new Date(source.getClock().at));
    },
    [goLive, source, writeUrl],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      // From live, the first step back starts at the present.
      if (!isTravelling.current) {
        source.seek(Date.now(), true);
        setTravelling(true);
      }
      source.step(direction);
    },
    [isTravelling, source],
  );

  const play = useCallback(() => {
    if (isTravelling.current) source.play();
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
      scrub,
      commit,
      step,
      play,
      pause,
      setRate,
      goLive,
    }),
    [clock, commit, goLive, open, pause, play, scrub, setRate, source, step, toggle, travelling],
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
