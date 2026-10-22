import * as React from "react"

import { cn } from "@/core/util/utils"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/**
 * How many tracks an item spans along one axis.
 *
 * - `2`                               fixed span
 * - `{ min: 1, ideal: 2 }`            may shrink to 1, prefers 2
 * - `{ min: 1, ideal: 2, max: 3 }`    may also grow to fill gaps
 * - `{ min: 2, ideal: "50%" }`        ideal relative to the grid's column count
 */
export type BentoSpan =
  | number
  | { min?: number; ideal: number | `${number}%`; max?: number }

type Size = { w: number; h: number; cost: number }

type Placement = { index: number; col: number; row: number; w: number; h: number }

/* -------------------------------------------------------------------------- */
/*                                   Solver                                   */
/* -------------------------------------------------------------------------- */

/**
 * Order-preserving bento packing, exact.
 *
 * Items are placed one by one at the first free cell (leftmost cell on the
 * lowest level). Everything before that cell is filled, so each column's
 * occupied area is a prefix and the whole state is a skyline: one height per
 * column. At each step we either place the item in one of its candidate sizes
 * or leave a hole by raising the lowest segment to its lower neighbour; a
 * ragged bottom edge is penalised at the end. The result is the cheapest
 * layout under that rule, and visual order always matches input order.
 *
 * Performance:
 * - The skyline is normalised by its minimum and packed into an integer key;
 *   one mutable Int32Array is changed and undone in place, so the search
 *   allocates nothing per node.
 * - Memoised branch and bound. A greedy pass gives an upper bound.
 *   search(i, budget) returns the exact optimum from the current state when
 *   it is <= budget, otherwise a proven lower bound > budget. The memo stores
 *   either kind (exact >= 0, lower bounds negated), so pruned work is reused
 *   but never mistaken for an exact value.
 * - Options are tried cheapest first. Once an option's own cost plus the
 *   cheapest possible cost of all remaining items exceeds the best layout
 *   found so far, it and every later candidate are skipped.
 */
const EPS = 1e-9

function solveBento(
  candidates: Size[][],
  cols: number,
  holeCost: number,
  raggedCost: number
): Placement[] {
  const n = candidates.length

  // Candidates per item, sorted by cost, in flat typed arrays.
  const cw: Int32Array[] = [], ch: Int32Array[] = [], cc: Float64Array[] = []
  let maxH = 1
  for (let i = 0; i < n; i++) {
    const list = candidates[i]
      .filter((s) => s.w >= 1 && s.h >= 1 && s.w <= cols)
      .sort((a, b) => a.cost - b.cost || b.w * b.h - a.w * a.h)
    if (list.length === 0) throw new Error(`item ${i} has no size that fits ${cols} columns`)
    cw.push(Int32Array.from(list, (s) => s.w))
    ch.push(Int32Array.from(list, (s) => s.h))
    cc.push(Float64Array.from(list, (s) => s.cost))
    for (const s of list) if (s.h > maxH) maxH = s.h
  }

  // suffixMin[i]: lowest possible cost of items i..n-1 (ignoring holes).
  const suffixMin = new Float64Array(n + 1)
  for (let i = n - 1; i >= 0; i--) suffixMin[i] = suffixMin[i + 1] + cc[i][0]

  // Skyline key: normalised heights are in [0, maxH], one base-(maxH+1) digit
  // per column. Fall back to string keys if that does not fit in 2^53.
  const base = maxH + 1
  const numericKeys = Math.pow(base, cols) < Number.MAX_SAFE_INTEGER
  const memo: Map<number | string, number>[] = Array.from({ length: n + 1 }, () => new Map())

  const sky = new Int32Array(cols)
  let lo = 0, segStart = 0, segLen = 0

  const findLowest = () => {
    let m = sky[0], s = 0
    for (let c = 1; c < cols; c++) if (sky[c] < m) { m = sky[c]; s = c }
    let e = s
    while (e < cols && sky[e] === m) e++
    lo = m; segStart = s; segLen = e - s
  }
  const keyOf = (): number | string => {
    let m = sky[0]
    for (let c = 1; c < cols; c++) if (sky[c] < m) m = sky[c]
    if (numericKeys) {
      let k = 0
      for (let c = 0; c < cols; c++) k = k * base + (sky[c] - m)
      return k
    }
    let k = ""
    for (let c = 0; c < cols; c++) k += (sky[c] - m) + ","
    return k
  }
  const holeTarget = (start: number, len: number) =>
    Math.min(start > 0 ? sky[start - 1] : Infinity, start + len < cols ? sky[start + len] : Infinity)
  const raggedCostNow = () => {
    let max = sky[0], gap = 0
    for (let c = 1; c < cols; c++) if (sky[c] > max) max = sky[c]
    for (let c = 0; c < cols; c++) gap += max - sky[c]
    return gap * raggedCost
  }

  function search(i: number, budget: number): number {
    if (i === n) return raggedCostNow()

    const key = keyOf()
    const table = memo[i]
    const hit = table.get(key)
    if (hit !== undefined) {
      if (hit >= 0) return hit // exact
      if (-hit > budget + EPS) return -hit // proven lower bound already exceeds budget
    }

    findLowest()
    const min = lo, start = segStart, len = segLen
    const rest = suffixMin[i + 1]
    let best = Infinity
    let limit = budget
    let lower = Infinity // lower bound on this state's value, from all options

    // The hole option (it does not consume the item) is merged into the
    // cheapest-first order by its own cost. k === W.length + 1 never happens;
    // option index `holeAt` is where it slots in.
    const W = cw[i], H = ch[i], C = cc[i]
    const nk = W.length
    const canHole = len < cols
    const target = canHole ? holeTarget(start, len) : 0
    const holeOwn = canHole ? holeCost * len * (target - min) : Infinity
    let holeAt = nk
    if (canHole) {
      holeAt = 0
      while (holeAt < nk && C[holeAt] < holeOwn) holeAt++
    } else holeAt = -1

    for (let k = 0; k <= nk; k++) {
      // Hole slot first if it belongs here.
      if (k === holeAt) {
        const bound = holeOwn + suffixMin[i]
        if (bound > limit + EPS) {
          if (bound < lower) lower = bound
        } else {
          for (let c = start; c < start + len; c++) sky[c] = target
          const v = holeOwn + search(i, limit - holeOwn)
          for (let c = start; c < start + len; c++) sky[c] = min
          if (v < lower) lower = v
          if (v < best) { best = v; if (best < limit) limit = best }
        }
      }
      if (k === nk) break
      const own = C[k]
      if (own + rest > limit + EPS) {
        if (own + rest < lower) lower = own + rest
        // Later candidates cost at least as much; only a later hole slot can remain.
        if (holeAt > k) {
          const bound = holeOwn + suffixMin[i]
          if (bound < lower) lower = bound
        }
        break
      }
      const w = W[k]
      if (w > len) continue
      const top = min + H[k]
      for (let c = start; c < start + w; c++) sky[c] = top
      const v = own + search(i + 1, limit - own)
      for (let c = start; c < start + w; c++) sky[c] = min
      if (v < lower) lower = v
      if (v < best) { best = v; if (best < limit) limit = best }
    }

    if (best <= budget + EPS) {
      table.set(key, best) // every skipped option was provably worse than best
      return best
    }
    // No option within budget: record the best lower bound we proved.
    const lb = Math.max(lower, hit !== undefined ? -hit : 0, budget + EPS * 2)
    table.set(key, -lb)
    return lb
  }

  // Greedy upper bound: cheapest fitting size, else a hole.
  const greedy = () => {
    sky.fill(0)
    let cost = 0
    for (let i = 0; i < n; ) {
      findLowest()
      const W = cw[i]
      let k = 0
      while (k < W.length && W[k] > segLen) k++
      if (k < W.length) {
        for (let c = segStart; c < segStart + W[k]; c++) sky[c] = lo + ch[i][k]
        cost += cc[i][k]
        i++
      } else if (segLen < cols) {
        const t = holeTarget(segStart, segLen)
        cost += holeCost * segLen * (t - lo)
        for (let c = segStart; c < segStart + segLen; c++) sky[c] = t
      } else {
        throw new Error("unreachable: some size always fits a full-width segment")
      }
    }
    cost += raggedCostNow()
    sky.fill(0)
    return cost
  }

  const upper = greedy()
  let optimum = search(0, upper + EPS)

  // Replay: at each state pick the first option whose value matches.
  const placements: Placement[] = []
  sky.fill(0)
  for (let i = 0; i < n; ) {
    findLowest()
    const min = lo, start = segStart, len = segLen
    const W = cw[i], H = ch[i], C = cc[i]
    let moved = false
    for (let k = 0; k < W.length && !moved; k++) {
      if (W[k] > len) continue
      for (let c = start; c < start + W[k]; c++) sky[c] = min + H[k]
      const v = C[k] + search(i + 1, optimum - C[k] + EPS)
      if (Math.abs(v - optimum) <= 1e-6) {
        placements.push({ index: i, col: start, row: min, w: W[k], h: H[k] })
        optimum -= C[k]
        i++
        moved = true
      } else {
        for (let c = start; c < start + W[k]; c++) sky[c] = min
      }
    }
    if (!moved) {
      // Must be a hole.
      const t = holeTarget(start, len)
      const own = holeCost * len * (t - min)
      for (let c = start; c < start + len; c++) sky[c] = t
      optimum -= own
    }
  }
  return placements
}

/* -------------------------------------------------------------------------- */
/*                                   Cache                                    */
/* -------------------------------------------------------------------------- */

/**
 * Small LRU of solved layouts, shared by all grids. Resizing back and forth
 * across breakpoints (or remounting a grid) reuses earlier solutions.
 */
const solveCache = new Map<string, Placement[]>()
const SOLVE_CACHE_SIZE = 64

function cachedSolve(key: string, solve: () => Placement[]): Placement[] {
  const hit = solveCache.get(key)
  if (hit) {
    solveCache.delete(key)
    solveCache.set(key, hit)
    return hit
  }
  const result = solve()
  solveCache.set(key, result)
  if (solveCache.size > SOLVE_CACHE_SIZE) solveCache.delete(solveCache.keys().next().value!)
  return result
}

/* -------------------------------------------------------------------------- */
/*                                Breakpoints                                 */
/* -------------------------------------------------------------------------- */

/** Tailwind's default screens, applied to the grid's own width. */
const defaultBreakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 }

type BreakpointName = "base" | keyof typeof defaultBreakpoints

/** A value, or one value per breakpoint (mobile first, like Tailwind). */
type Responsive<T> = T | Partial<Record<BreakpointName, T>>

const isResponsiveRecord = (v: unknown): v is Partial<Record<BreakpointName, unknown>> =>
  typeof v === "object" &&
  v !== null &&
  !("ideal" in v) &&
  Object.keys(v).every((k) => k === "base" || k in defaultBreakpoints)

/** Name of the largest breakpoint whose min-width the grid has reached. */
function activeBreakpoint(width: number, breakpoints: Record<string, number>): string {
  let active = "base"
  for (const [name, min] of Object.entries(breakpoints).sort((a, b) => a[1] - b[1]))
    if (width >= min) active = name
  return active
}

/** Mobile-first lookup: the value at `bp`, falling back to smaller breakpoints. */
function pick<T>(value: Responsive<T> | undefined, bp: string, breakpoints: Record<string, number>): T | undefined {
  if (!isResponsiveRecord(value)) return value as T | undefined
  const order = ["base", ...Object.entries(breakpoints).sort((a, b) => a[1] - b[1]).map(([n]) => n)]
  let out: T | undefined
  for (const name of order.slice(0, order.indexOf(bp) + 1)) {
    const v = (value as Record<string, T | undefined>)[name]
    if (v !== undefined) out = v
  }
  return out
}

/* -------------------------------------------------------------------------- */
/*                         Preferences -> candidates                          */
/* -------------------------------------------------------------------------- */

function resolveSpan(span: BentoSpan | undefined, limit: number) {
  if (span === undefined) return { min: 1, ideal: 1, max: 1 }
  if (typeof span === "number") {
    const n = Math.min(Math.max(1, Math.round(span)), limit)
    return { min: n, ideal: n, max: n }
  }
  const raw =
    typeof span.ideal === "string"
      ? Math.round((parseFloat(span.ideal) / 100) * limit)
      : Math.round(span.ideal)
  // min is a hard floor (only capped by the grid width); ideal is pulled into
  // [min, limit]; max is pulled into [ideal, limit].
  const min = Math.min(Math.max(1, span.min ?? raw), limit)
  const ideal = Math.min(Math.max(raw, min), limit)
  const max = Math.min(Math.max(span.max ?? ideal, ideal), limit)
  return { min, ideal, max }
}

type ResolvedPrefs = { cols?: BentoSpan; rows?: BentoSpan; priority?: number }

function candidatesFor(prefs: ResolvedPrefs, gridCols: number): Size[] {
  const c = resolveSpan(prefs.cols, gridCols)
  const r = resolveSpan(prefs.rows, Infinity)
  const priority = Math.max(0, prefs.priority ?? 1)
  const out: Size[] = []
  for (let w = c.min; w <= c.max; w++)
    for (let h = r.min; h <= r.max; h++)
      out.push({
        w,
        h,
        // A column of deviation costs more than a row: width changes are
        // more visible in a bento grid.
        cost: priority * (2 * Math.abs(w - c.ideal) + Math.abs(h - r.ideal)),
      })
  return out
}

/* -------------------------------------------------------------------------- */
/*                                  Context                                   */
/* -------------------------------------------------------------------------- */

type BentoCell = {
  /** Columns and rows this item was given. */
  cols: number
  rows: number
  /** Active breakpoint of the grid ("base", "sm", "md", ...). */
  breakpoint: string
  /** Column count of the grid. */
  columns: number
}

const BentoCellContext = React.createContext<BentoCell | null>(null)

/** Inside a <BentoItem>: the size it was given, so content can adapt. */
function useBentoCell(): BentoCell {
  const cell = React.useContext(BentoCellContext)
  if (!cell) throw new Error("useBentoCell must be used inside a <BentoItem>")
  return cell
}

/* -------------------------------------------------------------------------- */
/*                                 Components                                 */
/* -------------------------------------------------------------------------- */

type BentoItemProps = React.ComponentProps<"div"> & {
  /** Column span preference, optionally per breakpoint. Defaults to 1. */
  cols?: Responsive<BentoSpan>
  /** Row span preference, optionally per breakpoint. Defaults to 1. */
  rows?: Responsive<BentoSpan>
  /**
   * How strongly this item holds its ideal size, optionally per breakpoint.
   * 1 is normal (default), 2-3 for key tiles, 0.5 or lower for fillers that
   * should flex first. 0 means the item takes whatever size closes the layout.
   */
  priority?: Responsive<number>
  /** Set to false to leave the item out, optionally per breakpoint. */
  show?: Responsive<boolean>
}

function BentoItem({
  cols: _cols,
  rows: _rows,
  priority: _priority,
  show: _show,
  className,
  ...props
}: BentoItemProps) {
  return (
    <div
      data-slot="bento-item"
      className={cn("grid min-h-0 min-w-0", className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Animation                                  */
/* -------------------------------------------------------------------------- */

type BentoAnimation = {
  /** Move and resize duration in ms. Default 320. */
  duration?: number
  /** Enter duration in ms. Default 260. */
  enterDuration?: number
  /** Exit duration in ms. Default 200. */
  exitDuration?: number
  /** Delay between items entering together, in ms. Default 30. */
  stagger?: number
  /** CSS easing for all animations. */
  easing?: string
}

const defaultAnimation: Required<BentoAnimation> = {
  duration: 320,
  enterDuration: 260,
  exitDuration: 200,
  stagger: 30,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
}

type Rect = { left: number; top: number; width: number; height: number }

/** One placed item as rendered in a commit. */
type Entry = {
  key: string
  item: React.ReactElement<BentoItemProps>
  cell: BentoCell
  placement: string
  style: React.CSSProperties
}

/** An item that was removed and is fading out. `rect` is null for the one commit before it is lifted out of the grid. */
type ExitEntry = { entry: Entry; rect: Rect | null }

/**
 * Records every item's on-screen rect right before React changes the DOM.
 * getSnapshotBeforeUpdate runs for the whole tree before any mutation, which
 * is the only reliable "first" position for FLIP, including items that are
 * mid-animation.
 */
class LayoutSnapshot extends React.Component<{
  grid: React.RefObject<HTMLDivElement | null>
  into: { current: Map<string, DOMRect> | null }
}> {
  getSnapshotBeforeUpdate() {
    const grid = this.props.grid.current
    const rects = new Map<string, DOMRect>()
    if (grid)
      for (const child of Array.from(grid.children) as HTMLElement[]) {
        const key = child.dataset.bentoKey
        if (key !== undefined) rects.set(key, child.getBoundingClientRect())
      }
    this.props.into.current = rects
    return null
  }
  componentDidUpdate() {}
  render() {
    return null
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

const cancelAnimations = (el: Element) => el.getAnimations().forEach((a) => a.cancel())

/* -------------------------------------------------------------------------- */
/*                                    Grid                                    */
/* -------------------------------------------------------------------------- */

type BentoGridProps = React.ComponentProps<"div"> & {
  /**
   * Column count, optionally per breakpoint: `{ base: 2, md: 4, lg: 6 }`.
   * If omitted, it is read from the resolved grid-template-columns, so
   * Tailwind classes like `grid-cols-2 md:grid-cols-4` drive it instead.
   */
  columns?: Responsive<number>
  /** Row height (CSS length or px), optionally per breakpoint. */
  rowHeight?: Responsive<number | string>
  /** Breakpoint min-widths in px, measured on the grid itself. Defaults to Tailwind's screens. */
  breakpoints?: Partial<typeof defaultBreakpoints>
  /** Grid width assumed before measuring (SSR and first render). Defaults to 0, i.e. `base`. */
  initialWidth?: number
  /** Column count assumed before measuring when columns come from CSS. */
  initialColumns?: number
  /** Cost per empty cell inside the layout. */
  holeCost?: number
  /** Cost per empty cell along the bottom edge. */
  raggedCost?: number
  /**
   * Animate items entering, leaving and moving (true by default). Pass an
   * object to tune timing. Always off under prefers-reduced-motion.
   */
  animate?: boolean | BentoAnimation
  /** Also play the enter animation for items present on first mount. */
  appear?: boolean
}

function BentoGrid({
  columns,
  rowHeight,
  breakpoints: customBreakpoints,
  initialWidth = 0,
  initialColumns = 4,
  holeCost = 10,
  raggedCost = holeCost,
  animate = true,
  appear = false,
  className,
  style,
  children,
  ref,
  ...props
}: BentoGridProps) {
  const breakpoints = React.useMemo(
    () => ({ ...defaultBreakpoints, ...customBreakpoints }) as Record<string, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(customBreakpoints)]
  )
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [bp, setBp] = React.useState(() => activeBreakpoint(initialWidth, breakpoints))
  const [cssCols, setCssCols] = React.useState(initialColumns)

  React.useImperativeHandle(ref, () => innerRef.current!, [])

  // Track the active breakpoint and the CSS column count. State only changes
  // when a breakpoint or the track count changes, so resizing within a
  // breakpoint does not re-render.
  React.useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => {
      const next = activeBreakpoint(el.clientWidth, breakpoints)
      setBp((prev) => (prev === next ? prev : next))
      // Columns from CSS: used when `columns` gives no value at this breakpoint.
      const tracks = getComputedStyle(el).gridTemplateColumns
      const n = tracks === "none" ? 1 : tracks.trim().split(/\s+/).length
      setCssCols((prev) => (prev === n ? prev : n))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [breakpoints])

  const pickedCols = pick(columns, bp, breakpoints)
  const cols = Math.max(1, pickedCols ?? cssCols)
  const pickedRowHeight = pick(rowHeight, bp, breakpoints)

  const items = (
    React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<BentoItemProps>[]
  ).filter((item) => pick(item.props.show, bp, breakpoints) !== false)

  const prefs: ResolvedPrefs[] = items.map(({ props }) => ({
    cols: pick(props.cols, bp, breakpoints),
    rows: pick(props.rows, bp, breakpoints),
    priority: pick(props.priority, bp, breakpoints),
  }))
  const signature = JSON.stringify(prefs)

  const placements = React.useMemo(
    () =>
      cachedSolve(`${cols}|${holeCost}|${raggedCost}|${signature}`, () =>
        solveBento(prefs.map((p) => candidatesFor(p, cols)), cols, holeCost, raggedCost)
      ),
    // Children are new objects each render; re-solve only when the resolved
    // preferences, column count or costs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature, cols, holeCost, raggedCost]
  )

  const entries: Entry[] = placements.map((p) => {
    const item = items[p.index]
    return {
      key: String(item.key),
      item,
      cell: { cols: p.w, rows: p.h, breakpoint: bp, columns: cols },
      placement: `${p.col}/${p.w}/${p.row}/${p.h}`,
      style: {
        ...item.props.style,
        gridColumn: `${p.col + 1} / span ${p.w}`,
        gridRow: `${p.row + 1} / span ${p.h}`,
      },
    }
  })
  const layout = `${cols}|${String(pickedRowHeight)}`

  /* ---------------------------- animation state --------------------------- */

  const reducedMotion = useReducedMotion()
  const animated = animate !== false && !reducedMotion
  const timing = { ...defaultAnimation, ...(typeof animate === "object" ? animate : {}) }

  const snapshotRef = React.useRef<Map<string, DOMRect> | null>(null)
  const committedRef = React.useRef<{ entries: Map<string, Entry>; layout: string } | null>(null)
  const exitsRef = React.useRef(new Map<string, ExitEntry>())
  const [, rerender] = React.useReducer((x: number) => x + 1, 0)

  // Items to keep rendering while they fade out: exits already in progress,
  // plus anything that disappeared since the last commit. The latter keep
  // their old grid placement (same key, same DOM node) for one commit, then
  // the layout effect lifts them out of the flow.
  const currentKeys = new Set(entries.map((e) => e.key))
  const exiting: ExitEntry[] = []
  if (animated) {
    for (const [key, x] of exitsRef.current) if (!currentKeys.has(key)) exiting.push(x)
    const last = committedRef.current
    if (last)
      for (const [key, e] of last.entries)
        if (!currentKeys.has(key) && !exitsRef.current.has(key)) exiting.push({ entry: e, rect: null })
  }

  React.useLayoutEffect(() => {
    const grid = innerRef.current
    const last = committedRef.current
    const first = snapshotRef.current
    snapshotRef.current = null
    const current = new Map(entries.map((e) => [e.key, e]))
    committedRef.current = { entries: current, layout }
    if (!grid) return
    if (!animated) {
      exitsRef.current.clear()
      return
    }

    const nodes = new Map<string, HTMLElement>()
    for (const child of Array.from(grid.children) as HTMLElement[]) {
      const key = child.dataset.bentoKey
      if (key !== undefined) nodes.set(key, child)
    }
    const gridRect = grid.getBoundingClientRect()

    // Exits: lift newly removed items out of the grid at their last on-screen
    // rect and fade them out. They stay in the DOM until the fade finishes.
    let lifted = false
    for (const x of exiting) {
      const key = x.entry.key
      if (x.rect !== null || exitsRef.current.has(key)) continue
      const el = nodes.get(key)
      const r = first?.get(key)
      if (!el || !r) continue
      cancelAnimations(el)
      const rect: Rect = {
        left: r.left - gridRect.left - grid.clientLeft,
        top: r.top - gridRect.top - grid.clientTop,
        width: r.width,
        height: r.height,
      }
      const record: ExitEntry = { entry: x.entry, rect }
      exitsRef.current.set(key, record)
      lifted = true
      const fade = el.animate(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "scale(0.96)" },
        ],
        { duration: timing.exitDuration, easing: timing.easing, fill: "forwards" }
      )
      fade.onfinish = () => {
        if (exitsRef.current.get(key) !== record) return
        exitsRef.current.delete(key)
        rerender()
      }
    }

    const layoutChanged = last !== null && last.layout !== layout
    let entering = 0
    for (const [key, e] of current) {
      const el = nodes.get(key)
      if (!el) continue

      // An item added back while it was fading out: stop the fade and move it
      // from where it was to its new cell.
      const wasExiting = exitsRef.current.delete(key)
      const prev = last?.entries.get(key)

      // Enter.
      if (!prev && !wasExiting) {
        if (last || appear)
          el.animate(
            [
              { opacity: 0, transform: "scale(0.96)" },
              { opacity: 1, transform: "none" },
            ],
            {
              duration: timing.enterDuration,
              easing: timing.easing,
              delay: entering++ * timing.stagger,
              fill: "backwards",
            }
          )
        continue
      }

      // Move or resize (FLIP). Unchanged items keep any animation in flight.
      if (!wasExiting && prev && prev.placement === e.placement && !layoutChanged) continue
      const f = first?.get(key)
      if (!f) continue
      cancelAnimations(el)
      const l = el.getBoundingClientRect()
      const dx = f.left - l.left
      const dy = f.top - l.top
      if (
        Math.abs(dx) < 0.5 &&
        Math.abs(dy) < 0.5 &&
        Math.abs(f.width - l.width) < 0.5 &&
        Math.abs(f.height - l.height) < 0.5
      )
        continue
      // Size animates as real width/height, so content reflows instead of
      // stretching the way a scale transform would.
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, width: `${f.width}px`, height: `${f.height}px` },
          { transform: "translate(0px, 0px)", width: `${l.width}px`, height: `${l.height}px` },
        ],
        { duration: timing.duration, easing: timing.easing }
      )
    }

    if (lifted) rerender()
  })

  /* --------------------------------- render -------------------------------- */

  const renderEntry = (e: Entry, extra?: Record<string, unknown>) => (
    <BentoCellContext.Provider key={e.key} value={e.cell}>
      {React.cloneElement(e.item, {
        "data-bento-key": e.key,
        style: e.style,
        ...extra,
      } as Partial<BentoItemProps>)}
    </BentoCellContext.Provider>
  )

  return (
    <div
      ref={innerRef}
      data-slot="bento-grid"
      data-breakpoint={bp}
      className={cn("grid grid-cols-4 auto-rows-[10rem] gap-4", className)}
      style={{
        position: "relative",
        ...(pickedCols !== undefined && { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }),
        ...(pickedRowHeight !== undefined && {
          gridAutoRows: typeof pickedRowHeight === "number" ? `${pickedRowHeight}px` : pickedRowHeight,
        }),
        ...style,
      }}
      {...props}
    >
      <LayoutSnapshot grid={innerRef} into={snapshotRef} />
      {entries.map((e) => renderEntry(e))}
      {exiting.map(({ entry, rect }) =>
        renderEntry(entry, {
          "data-bento-exiting": "",
          "aria-hidden": true,
          style: rect
            ? {
                ...entry.item.props.style,
                position: "absolute",
                boxSizing: "border-box",
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                margin: 0,
                pointerEvents: "none",
              }
            : { ...entry.style, pointerEvents: "none" },
        })
      )}
    </div>
  )
}

export { BentoGrid, BentoItem, useBentoCell, solveBento, defaultBreakpoints }
export type { BentoGridProps, BentoItemProps, BentoCell, BentoAnimation, Responsive }
