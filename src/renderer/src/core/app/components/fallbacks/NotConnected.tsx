import { Arkitekt } from "@/core/app/Arkitekt";
import { ArkitektLogo } from "@/core/app/components/logos/ArkitektLogo";
import { Button } from "@/core/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/core/components/ui/collapsible";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { AddProfileButton } from "@/core/app/components/profile/AddProfileButton";
import { ProfileCards } from "@/core/app/components/profile/ProfileCards";
import { ConnectionDoctorSheet } from "@/core/app/components/doctor/ConnectionDoctor";
import { DEFAULT_COORDINATION_SERVER_HOST, DEFAULT_COORDINATION_SERVER_URL } from "@/core/constants";
import { endpointToProbeTargets } from "@/core/lib/arkitekt/doctor/targets";
import { CustomEndpointSheet } from "./CustomEndpointSheet";

/**
 * The signed-out screen — in its two genuinely different situations.
 *
 * Signed out is not the same as having no accounts: the profile book outlives a
 * failed auto-login, a quit and being offline. A computer that holds logins
 * gets them as a row of cards to pick from; a computer that holds none gets
 * onboarding, where the single grant is the whole offer rather than a plus
 * beside an empty row.
 */
export const NotConnected = () => {
  const hasProfiles = Arkitekt.useProfiles().length > 0;

  return (
    <Welcome>
      {hasProfiles ? <ReturningWelcome /> : <FirstRunWelcome />}
    </Welcome>
  );
};

/** The logo, the body, and the options nobody needs on the way in. */
const Welcome = ({ children }: { children: React.ReactNode }) => {
  // A login that just failed is the one case where these options are not
  // optional, so the section opens itself rather than hiding the way out.
  const autoLoginError = Arkitekt.useAutoLoginError();
  const [showHelp, setShowHelp] = useState(!!autoLoginError);

  return (
    <div className="flex flex-col w-full h-full bg-radial-[at_100%_100%] from-background to-backgroundpaired items-center justify-center px-4">
      <div className="flex w-full max-w-xl flex-col items-center space-y-6">
        <ArkitektLogo
          width={120}
          height={120}
          strokeColor="currentColor"
          cubeColor="var(--primary)"
          aColor="currentColor"
        />

        {children}

        <Collapsible open={showHelp} onOpenChange={setShowHelp} className="w-full">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <ChevronDown
                className={`h-4 w-4 mr-2 transition-transform ${showHelp ? "rotate-180" : ""
                  }`}
              />
              More Options
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="flex flex-col items-center gap-3">
              <CustomEndpointSheet />
              <ConnectionDoctorSheet
                label="Diagnose connection"
                variant="ghost"
                context={{
                  kind: "discovery",
                  endpointUrl: DEFAULT_COORDINATION_SERVER_URL,
                }}
                buildTargets={() => endpointToProbeTargets(DEFAULT_COORDINATION_SERVER_URL)}
                originalError={autoLoginError ?? undefined}
                subject={DEFAULT_COORDINATION_SERVER_HOST}
              />
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <a
                  href="https://arkitekt.live/docs/introduction/basics"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  What is Arkitekt?
                </a>
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

/** Accounts this computer already holds, left to right, plus one more. */
const ReturningWelcome = () => (
  <>
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="text-sm text-muted-foreground">
        Choose an account to continue, or add another.
      </p>
    </div>

    <div className="flex w-full flex-wrap items-start justify-center gap-3">
      <ProfileCards />
      <AddProfileButton />
    </div>
  </>
);

/** No accounts yet: one thing to do, and it says where it takes you. */
const FirstRunWelcome = () => (
  <>
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold">Let's get you started</h1>
      <p className="text-sm text-muted-foreground">
        Sign in to an Arkitekt deployment to set up your first account. Your
        browser opens so you can approve this app — the accounts you add stay on
        this computer.
      </p>
    </div>

    <AddProfileButton presentation="hero" />
  </>
);
