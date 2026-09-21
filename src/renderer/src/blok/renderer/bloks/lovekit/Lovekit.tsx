import * as React from "react";
import { AsyncSoloBroadcastWidget } from "@/lovekit/widgets/SoloBroadcastWidget";
import { Guard } from "@/app/Arkitekt";
import { createBlokComponent, useBlok, useValue } from "../../runtime";
import * as z from "zod";
import { LovekitSoloBroadcast } from "@/linkers";

const classNameSchema = z
  .string()
  .optional()
  .describe("Extra Tailwind classes appended to the widget.");
const streamSchema = z
  .object({
    object: z.string(),
    __identifier: z.literal(LovekitSoloBroadcast.identifier),
  })
  .optional()
  .describe("The lovekit broadcast to render.");

const UnavailableNotice = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-sm text-muted-foreground">
    {children}
  </div>
);

export const StreamRenderBlok = createBlokComponent(
  {
    name: "StreamRender",
    schema: z
      .object({
        broadcast: streamSchema,
        className: classNameSchema,
      })
      .describe("Renders a live lovekit broadcast."),
  },
  ({ component, schema }) => {
    const blok = useBlok(component, schema);
    const broadcast = useValue(blok.broadcast);
    const className = useValue(blok.className);

    if (!broadcast?.object) {
      return <UnavailableNotice>No broadcast selected.</UnavailableNotice>;
    }

    // Convention #1: the lovekit Apollo client only exists once the service is
    // ready, so the guard has to wrap the widget from the outside — guarding
    // inside `AsyncSoloBroadcastWidget` would be too late, its query fires on
    // mount. A deployment without lovekit degrades to a notice.
    const unavailable = <UnavailableNotice>Lovekit is not available.</UnavailableNotice>;

    return (
      <Guard.Lovekit
        unavailable={unavailable}
        unconfigured={unavailable}
        configuring={unavailable}
        challenging={unavailable}
      >
        <React.Suspense fallback={<UnavailableNotice>Loading stream…</UnavailableNotice>}>
          <AsyncSoloBroadcastWidget id={broadcast.object} className={className} />
        </React.Suspense>
      </Guard.Lovekit>
    );
  },
);

export const lovekitBlokComponents = [StreamRenderBlok];
