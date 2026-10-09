/**
 * Which path assembles a brick out of its decoded chunks.
 *
 * The GPU repack copies with one compute dispatch PER SOURCE CHUNK, and every
 * dispatch (plus its bind-group switches and params) is recorded on the main
 * thread. That is the cheaper path while a brick is made of a few chunks, and
 * the wrong one when it is made of many: measured on a 46-slice, 4-channel
 * stack stored as single planes, a brick was ~238 chunks and the main thread
 * spent ~16 µs on each — 3.9 ms per brick, which capped the whole load at the
 * drain budget while the worker pool sat idle.
 *
 * The worker repack costs the main thread ONE texture write per brick however
 * many chunks feed it, and the copying spreads over the cores. So the route is
 * chosen by what the brick costs, not only by whether the GPU can take it —
 * independent of the dataset's layout and of the GPU.
 */

/** Most source chunks a brick may have and still be repacked on the GPU:
 * ~0.5 ms of main-thread recording at the measured per-chunk cost. */
export const GPU_REPACK_MAX_CHUNKS = 32;

/** Whether a brick of `chunkCount` source chunks is cheap enough for the GPU path. */
export function gpuRepackIsCheaper(chunkCount: number): boolean {
  return chunkCount <= GPU_REPACK_MAX_CHUNKS;
}
