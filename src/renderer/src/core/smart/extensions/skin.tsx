import { Command as CommandPrimitive } from "cmdk";
import React from "react";

import { cn } from "@/core/util/utils";
import type { RowPin } from "./rowPin";

/**
 * How the smart menu LOOKS, apart from what it does.
 *
 * Every row of the menu (and of the ⌘K palette) is a `CommandActionRow`: the
 * module decides what the row is and does — its title, icon, what Enter runs,
 * its progress, whether its last run failed — and the skin decides how that
 * is drawn. A view with a look of its own (the scene's annotation card draws
 * tiles) passes a skin to `SmartMenu.Root`; everything else gets
 * `LIST_SKIN`, the menu as it always looked.
 */

/** A row as its module describes it. */
export type ActionRowProps = {
  /** cmdk's key for the row; without one cmdk keys by TEXT, and equal texts break arrow navigation. */
  value?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** A right-click on the row (the shared "Run on" picker hooks in here). */
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | null;
  svg?: string | null;
  /** A picture of the row's own in the icon's place, e.g. an action's logo. */
  leading?: React.ReactNode;
  /** 0–100 while something the row started runs. */
  progress?: number | null;
  /** Something the row started is under way. */
  running?: boolean;
  /** Its last run failed: what to say about it. */
  failure?: { title: string; detail?: string } | null;
  /** The moment of a failure, briefly: the row lights up. */
  flash?: boolean;
  /** It cannot run right now (no agent online, …): what to say. The row stays
   * selectable, so choosing it can say why; the skin draws it as receded. */
  unavailable?: { reason: string } | null;
  /** Extra content at the row's right end — a list's; other skins may drop it. */
  trailing?: React.ReactNode;
  /** `RowIconButton`s of the row's own, drawn before the pin. */
  buttons?: React.ReactNode;
  /** A list's; other skins may drop it. */
  className?: string;
};

export type SkinRowProps = ActionRowProps & {
  /** The row's pin (`SectionHost` tells every row its own); null outside a menu section. */
  pin: RowPin | null;
};

export type SkinGroupProps = {
  heading: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
};

export type SmartMenuSkin = {
  Row: React.ComponentType<SkinRowProps>;
  /** One section's rows under its heading. */
  Group: React.ComponentType<SkinGroupProps>;
  /** Added to the list element (`SmartMenu.List`), e.g. a grid. */
  listClassName?: string;
  /** Added to the slot the pinned rows are lifted into (`SmartMenu.Pinned`). */
  pinnedClassName?: string;
};

const SkinContext = React.createContext<SmartMenuSkin | null>(null);

export const SmartMenuSkinProvider = SkinContext.Provider;

/** The skin of the menu this is in; null = the default (`LIST_SKIN`), which the caller resolves. */
export const useSmartMenuSkinOverride = () => React.useContext(SkinContext);

/**
 * What every skin's row is drawn inside: cmdk's item, unstyled. It carries
 * the behaviour — Enter and click run `onSelect`, the arrow keys move onto
 * it, the menu's first-item selection finds it (`[cmdk-item]`), a right-click
 * reaches `onContextMenu` — so a skin only decides what is inside and how it
 * looks. `group/command-item` is what `RowIconButton` shows itself on.
 */
export const SmartRowItem = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    data-slot="command-item"
    className={cn("group/command-item outline-hidden select-none", className)}
    {...props}
  />
);
