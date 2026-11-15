/**
 * What this agent has reported and the server has not yet acknowledged.
 *
 * Agent protocol 2: every report carries `pos`, its position in this process's
 * stream (`journal_session`). The server acknowledges cumulatively
 * (`JOURNAL_ACK {through}`), says in `INIT` how far it has the session, and
 * refuses a gap (`JOURNAL_NACK {expected}`). Nothing here is ever tried anew:
 * a frame sent again is the same frame at the same position, which the server
 * stores once.
 *
 * The journal lives as long as the page does. A reload is a new process with a
 * new session, and the server ends what the old one left open.
 */

export type Journaled<F> = F & {
  pos: number;
  journal_session: string;
  agent_ts: number;
};

export type Skip = { session: string; first: number; last: number };

export class Journal<F extends object> {
  readonly session: string;
  private next = 1;
  private held: Journaled<F>[] = [];

  constructor(session: string, private now: () => number = () => Date.now() / 1000) {
    this.session = session;
  }

  /** Give `frame` the next position and keep it until it is acknowledged. */
  record(frame: F): Journaled<F> {
    const entry = {
      ...frame,
      pos: this.next++,
      journal_session: this.session,
      agent_ts: this.now(),
    };
    this.held.push(entry);
    return entry;
  }

  /** The server has everything through `through`: forget it. */
  ack(through: number): void {
    this.held = this.held.filter((entry) => entry.pos > through);
  }

  /** What is still owed, in order (optionally from a position on). */
  owed(from = 0): Journaled<F>[] {
    return this.held.filter((entry) => entry.pos >= from);
  }

  /** Whether anything is owed: only then is the session named in REGISTER. */
  get owes(): boolean {
    return this.held.length > 0;
  }

  /**
   * The positions the server expects and this journal no longer holds, if any:
   * said once (`JOURNAL_SKIP`), so the server can pass them over.
   */
  missing(expected: number): Skip | null {
    const first = this.held.length > 0 ? this.held[0].pos : this.next;
    if (first <= expected) return null;
    return { session: this.session, first: expected, last: first - 1 };
  }
}
