import type { Clock } from '../../src/clock/clock';

/**
 * A `Clock` test double that pins "now" to an exact instant, mutable via
 * `set` so a single instance can be reused (and re-pinned) across the `it`
 * blocks of a spec file that shares one app instance.
 */
export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
