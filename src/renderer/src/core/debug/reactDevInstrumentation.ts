/**
 * Switches off the two hooks React's DEV build uses to feed DevTools, so the
 * app stays usable with DevTools open.
 *
 * React 19.2 (dev only) calls `console.createTask` for every JSX element
 * (owner stacks) and `console.timeStamp` for every component render (the
 * "Components ⚛" / "Scheduler ⚛" performance tracks). Both cost next to
 * nothing with DevTools closed; with it open the debugger records an async
 * stack per task and the inspector receives every timestamp.
 *
 * React reads both ONCE, when its module is evaluated, and falls back by
 * itself when they are missing. So this file is its own module script in
 * `index.html`, BEFORE `main.tsx`, and must import nothing. An import at the
 * top of `main.tsx` is too late: the JSX transform hoists its
 * `react/jsx-dev-runtime` import above every import written there.
 *
 * For a profiling session that wants the React tracks back:
 *   localStorage["ork:react-devtools-tracks"] = "1"   // then reload
 */
export const REACT_DEVTOOLS_TRACKS_KEY = "ork:react-devtools-tracks";

if (import.meta.env.DEV) {
  let keep = false;
  try {
    keep = localStorage.getItem(REACT_DEVTOOLS_TRACKS_KEY) === "1";
  } catch {
    // No storage (private window, blocked): keep the cheap default.
  }
  if (!keep) {
    const hooks = console as { createTask?: unknown; timeStamp?: unknown };
    hooks.createTask = undefined;
    hooks.timeStamp = undefined;
  }
}
