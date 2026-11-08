/**
 * The look of a compact card header's icon buttons. Firm enough to read over
 * the blurred canvas: the cards sit on `bg-background/40`, and anything much
 * below `/70` vanished into whatever the scene drew behind them.
 *
 * A leaf of its own, so a control that only needs the look (the rename
 * pencil) does not pull in the card actions and what they import.
 */
export const HEADER_BUTTON = "h-5 w-5 shrink-0 p-0 text-foreground/75 hover:text-foreground";
