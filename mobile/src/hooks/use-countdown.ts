import { useEffect, useState } from 'react';

/**
 * A seconds countdown that ticks itself to 0 — the resend-cooldown timer
 * shared by verify-email.tsx and reset-password.tsx. Setting a new value
 * (re)starts the countdown from there.
 *
 * No drift-critical precision needed (issues #20/#21) — a fresh interval per
 * second is simple and self-cleaning rather than a single long-lived one
 * that needs its own elapsed-time bookkeeping.
 */
export function useCountdown(
  initialSeconds: number,
): [number, (seconds: number) => void] {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  return [seconds, setSeconds];
}
