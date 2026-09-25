import * as React from "react";
import { StructureDisplay } from "@/core/components/display/StructureDisplay";
import { createBlokComponent, useBlok, useValue } from "../../runtime";
import * as z from "zod";
import { LovekitSoloBroadcast } from "@/core/linkers";

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

    // The broadcast is lovekit's to show: its display, behind lovekit's guard.
    // A deployment without lovekit (or with it not ready) degrades to a notice.
    return (
      <StructureDisplay
        identifier={LovekitSoloBroadcast.identifier}
        id={broadcast.object}
        variant="card"
        className={className}
        fallback={<UnavailableNotice>Lovekit is not available.</UnavailableNotice>}
      />
    );
  },
);

export const lovekitBlokComponents = [StreamRenderBlok];
