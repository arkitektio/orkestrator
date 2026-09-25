import { ArkitektLogo } from "../../../ui/logos/ArkitektLogo";

/**
 * What a lazy route shows while its chunk is fetched.
 *
 * Not `ConnectingFallback`: the session is already proven by the time a module
 * suspends, so "Authenticate to continue" with a cancel button is a lie about
 * what the app is waiting for.
 *
 * The backdrop paints at once — it is the page's own gradient, so there is no
 * white flash — while the glow and the logo fade in after a beat. A chunk that
 * is already cached resolves inside that beat and never shows a loader at all.
 */
export const ModuleLoadingFallback = ({ label = "Loading" }: { label?: string }) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="relative h-full w-full overflow-hidden bg-radial-[at_100%_100%] from-background to-backgroundpaired"
  >
    <div className="absolute inset-0 animate-in fade-in duration-500 delay-150 fill-mode-both">
      {/* Out-of-focus brand light, drifting slowly out of phase. */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 size-[32rem] -translate-x-[70%] -translate-y-[60%] rounded-full bg-primary/25 blur-3xl animate-pulse [animation-duration:4s]" />
        <div className="absolute left-1/2 top-1/2 size-[24rem] -translate-x-[15%] -translate-y-[25%] rounded-full bg-primary/15 blur-3xl animate-pulse [animation-duration:6s] [animation-delay:1s]" />
      </div>

      {/* Frosted pane over the light, the logo breathing on top of it. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/30 backdrop-blur-2xl">
        <div className="animate-pulse [animation-duration:2.4s]">
          <ArkitektLogo
            width={72}
            height={72}
            strokeColor="currentColor"
            cubeColor="var(--primary)"
            aColor="currentColor"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-3 rounded-full border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none" />
          <span>{label}…</span>
        </div>
      </div>
    </div>
  </div>
);
