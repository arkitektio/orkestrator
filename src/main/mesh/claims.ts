import type { MeshConfig } from "./protocol";

/**
 * Which mesh each window needs, by webContents id: desired state only. A
 * window has one slot; a new claim replaces it and `undefined` clears it.
 */
export class ClaimSet {
  private readonly byOwner = new Map<number, MeshConfig>();

  set(owner: number, mesh: MeshConfig | undefined) {
    if (mesh) this.byOwner.set(owner, mesh);
    else this.byOwner.delete(owner);
  }

  values(): MeshConfig[] {
    return [...this.byOwner.values()];
  }
}

/** One config per mesh id, the first seen winning, pinned hosts merged. */
export const mergeConfigs = (configs: Iterable<MeshConfig>): MeshConfig[] => {
  const byId = new Map<string, MeshConfig>();
  for (const config of configs) {
    const seen = byId.get(config.id);
    byId.set(config.id, seen ? { ...seen, hosts: [...new Set([...seen.hosts, ...config.hosts])] } : config);
  }
  return [...byId.values()];
};
