import { Dialog as DialogPrimitive } from "radix-ui"
import * as React from "react"

import { Button } from "@/core/ui/button"
import { DialogFooterError } from "@/core/dialogs/DialogError"
import { usePageDialogHost } from "@/core/dialogs/PageDialogHost"
import { useChromeZoomClass } from "@/core/ui/ChromeSurface"
import { cn } from "@/core/util/utils"
import { XIcon } from "lucide-react"
import { resolveTriggerAsChild } from "./trigger-child"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  asChild,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" asChild={resolveTriggerAsChild(asChild, props.children)} {...props} />
}

function DialogPortal({
  container,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  // Inside the page, portal over the page (see PageDialogHost).
  const pageHost = usePageDialogHost()
  return <DialogPrimitive.Portal data-slot="dialog-portal" container={container ?? pageHost ?? undefined} {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs app-no-drag fixed inset-0 isolate z-50", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  container,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Portal target; defaults to the page host in context, else the body. */
  container?: HTMLElement | null
}) {
  const chromeZoom = useChromeZoomClass()
  return (
    <DialogPortal container={container ?? undefined}>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          chromeZoom,
          // A column: header and footer keep their height, a `DialogBody`
          // between them scrolls. A dialog without one scrolls as a whole.
          // Centered by `inset-0 m-auto`, not `left-1/2` + translate: with
          // `w-fit`, a left of 50% would leave it half the page to fit into.
          "bg-background data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 [--dialog-pad:--spacing(4)] flex flex-col h-fit max-h-[90cqh] overflow-y-auto max-w-[min(calc(100%-2rem),24rem)] gap-4 rounded-xl p-4 text-xs/relaxed ring-1 duration-100 app-no-drag fixed inset-0 m-auto z-50 w-full",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" className="absolute top-2 right-2" size="icon-sm">
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      // pr-8: clear of the close button in the corner.
      className={cn("gap-1 flex flex-col shrink-0 pr-8", className)}
      {...props}
    />
  )
}

/**
 * The part of a dialog that scrolls, between its header and footer, which
 * stay put. Inside a `<form>`, make the form a `DialogForm` so the column
 * reaches the body.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      // Bled to the edge (the container's padding, `--dialog-pad`) so the
      // scrollbar sits there, padded back; py-px keeps focus rings unclipped.
      className={cn(
        "mx-[calc(var(--dialog-pad,0px)*-1)] px-[var(--dialog-pad,0px)] min-h-0 flex-1 overflow-y-auto py-px flex flex-col gap-3",
        className,
      )}
      {...props}
    />
  )
}

/** A dialog's `<form>`: carries the column on to its body and footer. */
function DialogForm({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      data-slot="dialog-form"
      className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "gap-2 flex shrink-0 flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end",
        className
      )}
      {...props}
    >
      {/* In a registry dialog, a failed submit says why right above the buttons. */}
      <DialogFooterError className="order-last sm:order-first sm:basis-full" />
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-xs/relaxed *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
