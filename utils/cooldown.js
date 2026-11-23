/*
In-memory cooldown gate.

Usage:
  const cooldown = createCooldown(45_000);
  const { allowed, retryInMs } = cooldown.take();          // one global window
  const { allowed, retryInMs } = cooldown.take(userId);    // one window per user

`take()` checks the stored timestamp for the given key and either blocks the
call (returning the remaining time) or records the current call and allows it.
Blocked calls do NOT extend the window: the wait is always counted from the
last allowed call.
*/

const DEFAULT_KEY = 'global';

/**
 * Creates a cooldown gate with its own independent in-memory state.
 *
 * @param {number} windowMs Minimum time, in milliseconds, between allowed calls.
 * @returns {{
 *   take: (key?: string) => { allowed: boolean, retryInMs: number },
 * }}
 */
export function createCooldown(windowMs) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError('createCooldown: windowMs must be a positive number.');
  }

  const lastTakenAt = new Map();

  return {
    /**
     * Checks the cooldown for `key` and records the call when allowed.
     *
     * @param {string} [key='global'] Independent window identifier.
     * @returns {{ allowed: boolean, retryInMs: number }} `retryInMs` is 0 when allowed.
     */
    take(key = DEFAULT_KEY) {
      const now = Date.now();
      const previous = lastTakenAt.get(key);

      if (previous !== undefined) {
        const elapsed = now - previous;

        if (elapsed < windowMs) {
          return { allowed: false, retryInMs: windowMs - elapsed };
        }

        lastTakenAt.delete(key);
      }

      lastTakenAt.set(key, now);
      return { allowed: true, retryInMs: 0 };
    },
  };
}
