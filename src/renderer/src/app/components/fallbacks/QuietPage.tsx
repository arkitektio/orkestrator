/**
 * The page area during a launch that is still proving its stored token.
 *
 * Deliberately nothing but the card's own backdrop: no logo, no spinner, no
 * skeleton. The window has already painted its real chrome — rail, tabs, the
 * account in the footer — so a second "loading" moment in the middle of it
 * would announce a wait the user is not actually having. What fills in instead
 * is the app itself: module tiles as each service reports ready, then the route.
 *
 * Borrows the principle of `ModuleLoadingFallback` (paint the backdrop at once,
 * defer anything animated) with the animated half removed.
 */
export const QuietPage = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    data-testid="quiet-page"
    className="h-full w-full bg-radial-[at_100%_100%] from-background to-backgroundpaired"
  >
    <span className="sr-only">Signing in…</span>
  </div>
);

export default QuietPage;
