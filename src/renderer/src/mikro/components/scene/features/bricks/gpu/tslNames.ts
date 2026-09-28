/**
 * Collision-checked name minting for generated TSL.
 *
 * TSL variables and `Loop` iterators are emitted into a flat WGSL scope, so two
 * nodes minted with the same name silently shadow each other and the second
 * read returns the first's value. This has bitten this codebase before: an
 * unnamed internal `Loop` iterator shadowed the channel loop's `i`, and
 * `element(i)` started indexing by resident LEVEL instead of channel — the
 * image was wrong, nothing errored, and the WGSL had to be read by hand to find
 * it (see the header note in `brickNodeMaterials.ts`).
 *
 * Merging N layers into one pass multiplies that exposure: every accumulator,
 * every loop iterator and every sample temporary now exists N times in one
 * scope. Rather than rely on discipline, mint through a scope that throws the
 * moment a name repeats — a build-time failure instead of a rendering one.
 *
 * Usage:
 *   const scope = new NameScope();
 *   const names = scope.prefixed("m0");   // per member
 *   names("bestNorm")                     // "m0_bestNorm", reserved
 *   names("bestNorm")                     // throws
 */

export class NameScope {
  private readonly taken = new Set<string>();

  /** Reserve `name`, or throw if something already took it. */
  claim(name: string): string {
    if (this.taken.has(name)) {
      throw new Error(
        `[tsl] duplicate name "${name}" in one shader scope. TSL emits into a ` +
          `flat WGSL scope, so this would silently shadow the earlier ` +
          `declaration and read back the wrong value. Give the emitter a ` +
          `distinct prefix.`,
      );
    }
    this.taken.add(name);
    return name;
  }

  /**
   * A minting function that prefixes every name, for one member of a merged
   * pass. An empty prefix mints bare names — used by the single-member path so
   * its generated WGSL is unchanged from before the merge existed.
   */
  prefixed(prefix: string): (name: string) => string {
    return (name: string) => this.claim(prefix ? `${prefix}_${name}` : name);
  }

  /** Names reserved so far, in claim order (diagnostics and tests). */
  claimed(): string[] {
    return [...this.taken];
  }

  has(name: string): boolean {
    return this.taken.has(name);
  }
}
