/**
 * How a page action is drawn once the action row has decided how much room it
 * can spare. The action itself renders the form; the row only picks it.
 */
export type ActionSlotMode = "row" | "icon" | "menu" | "hidden";

/** What an action gives up, in order, when the row runs out of room. */
export type CollapseMode = "menu" | "icon" | "hide";

export type PageActionPolicy = {
  /** Never degraded, whatever the width. */
  alwaysShow?: boolean;
  /** Eviction order: the lowest priority gives way first. Default 0. */
  priority?: number;
  /** The path down which this action degrades. Default "menu". */
  collapse?: CollapseMode;
};

/**
 * The degradation paths. An action steps one position to the right each time
 * it is picked, and stops at the end.
 *
 * "icon" is the only two-step path: the action first drops its label and only
 * moves into the burger when even the glyph does not fit.
 */
const PATHS: Record<CollapseMode, readonly ActionSlotMode[]> = {
  menu: ["row", "menu"],
  icon: ["row", "icon", "menu"],
  hide: ["row", "hidden"],
};

/**
 * Spare room an upgrade must find before it is taken. Without it an action
 * sitting exactly on the boundary flips between its row and icon forms on
 * every pixel of a drag, since a wider form immediately makes itself not fit.
 */
export const UPGRADE_SLACK = 12;

export type PlanItem = {
  /** Measured width of the row form, in pixels. */
  width: number;
  policy: PageActionPolicy;
};

export type PlanOptions = {
  items: readonly PlanItem[];
  /** Width the row has to fill. */
  available: number;
  /** Pixels between items; must match the row's `gap`. */
  gap: number;
  /** Width of the burger, charged once anything lands in the menu. */
  menuWidth: number;
  /** Width of an icon-only action — a fixed Button size, never measured. */
  iconWidth: number;
  /**
   * The modes currently on screen. Given, upgrades need `UPGRADE_SLACK` of
   * spare room; downgrades always apply at once, so nothing ever overflows
   * while waiting for a margin.
   */
  previous?: readonly ActionSlotMode[];
};

const stepOf = (collapse: CollapseMode, mode: ActionSlotMode) => {
  const index = PATHS[collapse].indexOf(mode);
  return index < 0 ? 0 : index;
};

/** Width an action occupies in the row; menu and hidden cost nothing here. */
const widthOf = (item: PlanItem, mode: ActionSlotMode, iconWidth: number) => {
  if (mode === "row") return item.width;
  if (mode === "icon") return iconWidth;
  return 0;
};

export const measurePlan = (
  items: readonly PlanItem[],
  modes: readonly ActionSlotMode[],
  { gap, menuWidth, iconWidth }: Pick<PlanOptions, "gap" | "menuWidth" | "iconWidth">,
) => {
  const widths = items
    .map((item, index) => widthOf(item, modes[index], iconWidth))
    .filter((width) => width > 0);
  if (modes.some((mode) => mode === "menu")) widths.push(menuWidth);
  if (widths.length === 0) return 0;
  return widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
};

/**
 * Picks the action that gives way next: the lowest priority, and among equals
 * the rightmost — so a row collapses from its right edge, as it always did.
 * Pinned actions and actions already at the end of their path are skipped.
 */
const pickVictim = (items: readonly PlanItem[], modes: readonly ActionSlotMode[]) => {
  let victim = -1;
  let best = Number.POSITIVE_INFINITY;
  items.forEach((item, index) => {
    const collapse = item.policy.collapse ?? "menu";
    if (item.policy.alwaysShow) return;
    if (stepOf(collapse, modes[index]) >= PATHS[collapse].length - 1) return;
    const priority = item.policy.priority ?? 0;
    // `<=` keeps the rightmost of equal priorities.
    if (priority <= best) {
      best = priority;
      victim = index;
    }
  });
  return victim;
};

const solve = (options: PlanOptions): ActionSlotMode[] => {
  const { items, available } = options;
  const modes: ActionSlotMode[] = items.map(() => "row");
  // Bounded by the total number of steps available across all items.
  while (measurePlan(items, modes, options) > available) {
    const victim = pickVictim(items, modes);
    // Only pinned actions are left: the row overflows rather than hiding one.
    if (victim < 0) break;
    const collapse = items[victim].policy.collapse ?? "menu";
    modes[victim] = PATHS[collapse][stepOf(collapse, modes[victim]) + 1];
  }
  return modes;
};

/** Whether `next` puts any action into a fuller form than `previous` did. */
const isUpgrade = (
  items: readonly PlanItem[],
  previous: readonly ActionSlotMode[],
  next: readonly ActionSlotMode[],
) =>
  items.some((item, index) => {
    const collapse = item.policy.collapse ?? "menu";
    return stepOf(collapse, next[index]) < stepOf(collapse, previous[index]);
  });

/**
 * Decides how every action in the row is drawn.
 *
 * Every action starts in its row form; while the row is over budget the next
 * victim degrades one step along its path. The result is stable for a given
 * width, so the caller can compare it against what is on screen and skip the
 * state write when nothing moved.
 */
export const planActions = (options: PlanOptions): ActionSlotMode[] => {
  const plan = solve(options);
  const { previous, items } = options;
  if (!previous || previous.length !== items.length) return plan;
  if (!isUpgrade(items, previous, plan)) return plan;
  // Something wants to grow back: only let it if the room is comfortable.
  return solve({ ...options, available: options.available - UPGRADE_SLACK });
};
