import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Tier } from '../results';

export const TIER_COLOR: Record<Tier, string> = {
  0: 'var(--color-ink-3)',
  1: 'var(--color-ink-2)',
  2: 'var(--color-amber)',
  3: 'var(--color-signal)',
  4: 'var(--color-signal)',
};

/** Radio-style signal strength: one bar per tier, lit bars rise in one by one. */
export function SignalMeter({ tier, size = 1 }: { tier: Tier; size?: number }) {
  const lit = tier + 1;
  return (
    <div className="inline-flex items-end gap-1" style={{ height: 44 * size }} aria-hidden="true" dir="ltr">
      {[0, 1, 2, 3, 4].map((i) => {
        const on = i < lit;
        return (
          <motion.span
            key={i}
            className="block rounded-[3px] border-2 border-ink"
            style={{
              width: 12 * size,
              height: `${(i + 1) * 20}%`,
              background: on ? TIER_COLOR[tier] : 'transparent',
              transformOrigin: 'bottom',
            }}
            initial={{ scaleY: 0 }}
            animate={
              tier === 0 && on
                ? { scaleY: [0, 1, 0.4, 1, 0.6, 1] } // static: the only bar flickers
                : { scaleY: 1 }
            }
            transition={{
              delay: 0.25 + i * 0.12,
              duration: tier === 0 ? 1.4 : 0.35,
              repeat: tier === 0 ? Infinity : 0,
              repeatDelay: 0.8,
            }}
          />
        );
      })}
    </div>
  );
}

const CONFETTI_COLORS = ['#E04E1B', '#F0A92B', '#22586A', '#5F6D28', '#E7D3A0', '#C8431A'];

/** Paper-confetti burst from the top of the screen. Skipped for reduced-motion users. */
export function Confetti({ amount }: { amount: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: amount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        drift: (Math.random() - 0.5) * 30,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        rotate: (Math.random() - 0.5) * 720,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() < 0.25,
      })),
    [amount],
  );
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced || amount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block border border-ink/40"
          style={{
            left: `${p.x}%`,
            width: p.w,
            height: p.round ? p.w : p.h,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
          }}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: `${p.drift}vw`, rotate: p.rotate, opacity: [1, 1, 0.9, 0] }}
          transition={{ delay: p.delay, duration: p.duration, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
