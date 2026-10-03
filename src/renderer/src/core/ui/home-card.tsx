import * as React from "react"

import { Card } from "@/core/ui/card"
import { cn } from "@/core/util/utils"

/**
 * The card a module's home page lists its objects in: one height, one padding,
 * a title on top and a muted meta line at the bottom. Its border is barely
 * there at rest; on hover it takes the brand colour and a subtle shadow lifts
 * the card.
 *
 * `relative` because the title's link stretches over the whole card (see
 * `HomeCardTitle`). A card that is a picture rather than a row (mikro's array
 * dataset) overrides the size with `className` and keeps the rest.
 */
function HomeCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <Card
      data-slot="home-card"
      className={cn(
        "relative h-20 justify-between gap-1 px-3 py-2 duration-200 ring-foreground/5 hover:ring-primary/40 dark:hover:ring-primary/50 hover:shadow-md hover:shadow-black/10 dark:hover:shadow-black/40",
        className,
      )}
      {...props}
    />
  )
}

/**
 * The name, with the kind's icon in front of it. The link inside (a smart
 * object's `DetailLink`) is stretched over the card so the whole card opens the
 * object; anything else clickable on the card has to sit above it
 * (`relative z-10`). `stretch={false}` keeps the link to its text.
 */
function HomeCardTitle({
  className,
  icon,
  stretch = true,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  stretch?: boolean
}) {
  return (
    <div
      data-slot="home-card-title"
      className={cn(
        "flex min-w-0 items-center gap-2 text-sm font-medium leading-tight [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        stretch && "[&_a]:after:absolute [&_a]:after:inset-0",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

/** The muted line under the name: sizes, shapes, units, a badge. */
function HomeCardMeta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="home-card-meta"
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { HomeCard, HomeCardTitle, HomeCardMeta }
