import { cn } from '@/core/util/utils'

/**
 * The same glyphs four times over, each layer a blend against what the ones
 * under it left on the image:
 *
 *  1. white, `difference`   → the inverse of the image, channel by channel
 *  2. grey, `saturation`    → that inverse without its colour: a grey
 *  3. ⅔ grey, `color-burn`  → darks pushed to black
 *  4. ⅔ grey, `color-dodge` → lights pushed to white
 *
 * Together a threshold: black text over a bright image, white over a dark one,
 * whatever its hue. CSS has no single blend that does this, and a `filter`
 * cannot see the backdrop, hence the copies.
 *
 * A blend only reaches as far as the nearest stacking context, so NOTHING
 * between this and the canvas may create one (no `z-*` on a positioned
 * ancestor, no opacity, transform or filter): the layers carry the `z-40`
 * themselves. Single-line text only: every layer truncates on its own.
 */
const BLEND_LAYERS = [
  'text-neutral-500 mix-blend-saturation',
  'text-[#aaa] mix-blend-color-burn',
  'text-[#aaa] mix-blend-color-dodge'
]

/** The blend of everything that is not text (icons, controls): the plain inverse. */
export const INVERTED = 'relative z-40 text-white mix-blend-difference'

export const InvertedText = ({ children, className }: { children: string; className?: string }) => (
  <span className={cn('relative block min-w-0', className)}>
    <span className={cn('block truncate', INVERTED)}>{children}</span>
    {BLEND_LAYERS.map((layer) => (
      <span
        key={layer}
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 z-40 block select-none truncate', layer)}
      >
        {children}
      </span>
    ))}
  </span>
)
