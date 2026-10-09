import { useReportNotificationCount } from "@/core/dashboard/notificationCount";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { PanelBottom, Phone, X } from "lucide-react";

import { useCallInvites, useDismissInvite } from "./invites";
import { fromCallStructure } from "./structureInput";
import { useOpenCall } from "./useOpenCall";

/**
 * The calls the member was asked into, for the Notifications widget
 * (lovekit's `notifications` slot section on `@lok/user`). What is sent
 * to a person is this and only this; joining is open to everyone through
 * "Join calls" on the home page.
 */
export const CallInviteNotifications = () => {
  const invites = useCallInvites();
  const dismiss = useDismissInvite();
  const openCall = useOpenCall();

  useReportNotificationCount("lovekit.callinvites", invites.length);

  return (
    <>
      {invites.map((invite) => {
        const subject = invite.call.about[0];
        return (
          <div key={invite.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2" data-testid="call-invite">
            <Phone className="mt-0.5 size-3 shrink-0 animate-pulse text-emerald-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">
                <span className="font-medium text-foreground">
                  <StructureDisplay identifier="@lok/user" id={invite.inviter.sub} variant="inline" fallback={invite.inviter.preferredUsername} />
                </span>
                <span className="text-muted-foreground"> asks you into </span>
                <span className="font-medium text-foreground">{invite.call.title}</span>
                {subject && (
                  <span className="text-muted-foreground">
                    {" "}
                    about <StructureDisplay {...fromCallStructure(subject)} variant="inline" fallback={subject.identifier} />
                  </span>
                )}
              </p>
              <div className="mt-1 flex gap-1">
                <Button size="xs" onClick={() => openCall(invite.call, { join: true })}>
                  <Phone /> Join
                </Button>
                <Button size="xs" variant="outline" onClick={() => openCall(invite.call, { join: true, target: "side" })}>
                  <PanelBottom /> To the side
                </Button>
                <Button size="xs" variant="ghost" onClick={() => void dismiss(invite)}>
                  <X /> Dismiss
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
