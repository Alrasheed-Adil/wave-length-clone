import { useEffect, useId, useRef } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useSpring } from 'framer-motion';
import { BAND } from '@shared/scoring';

/*
  The tuning dial.

  Geometry: a half disc centred at (CX, CY). A value v ∈ [0,1] maps to the angle
  θ = π·(1 − v), so 0 is the far left and 1 the far right. The dial is always
  rendered dir="ltr" — the physical left end stays on the left in Arabic too,
  and the card labels are pinned to the ends they describe.

  Layers (bottom → top): face, target bands, shutter (grille that hides the
  target), outer scale ring, needle, hub.
*/

const W = 426;
const H = 236;
const CX = W / 2;
const CY = 218;
const R_FACE = 176; // tuning face (target lives here)
const R_RING = 200; // outer scale ring

const polar = (v: number, r: number) => {
  const t = Math.PI * (1 - v);
  return [CX + r * Math.cos(t), CY - r * Math.sin(t)] as const;
};

function wedge(v1: number, v2: number, r: number) {
  const [x1, y1] = polar(Math.max(0, v1), r);
  const [x2, y2] = polar(Math.min(1, v2), r);
  return `M${CX} ${CY}L${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
}

const HALF = `M${CX - R_FACE} ${CY}A${R_FACE} ${R_FACE} 0 0 1 ${CX + R_FACE} ${CY}Z`;

const BANDS: { from: number; to: number; pts: number; fill: string }[] = [
  { from: -2.5, to: -1.5, pts: 2, fill: 'var(--color-sand)' },
  { from: -1.5, to: -0.5, pts: 3, fill: 'var(--color-amber)' },
  { from: -0.5, to: 0.5, pts: 4, fill: 'var(--color-signal)' },
  { from: 0.5, to: 1.5, pts: 3, fill: 'var(--color-amber)' },
  { from: 1.5, to: 2.5, pts: 2, fill: 'var(--color-sand)' },
];

export interface DialProps {
  value: number;
  /** Target centre. `null` keeps the shutter closed. */
  target: number | null;
  interactive: boolean;
  onChange?: (v: number) => void;
  onDragChange?: (dragging: boolean) => void;
  /** Ink colour of the needle's owner team, for a subtle tint. */
  accent?: string;
  /** Highlight the band the needle landed in (reveal). */
  scored?: number | null;
  ariaLabel?: string;
}

export function Dial({ value, target, interactive, onChange, onDragChange, accent, scored, ariaLabel }: DialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const clipId = useId().replace(/:/g, '');
  const open = target !== null;

  // Physical needle: a spring chases the value so remote updates glide instead of snapping.
  const raw = useMotionValue(value);
  const spring = useSpring(raw, { stiffness: 420, damping: 32, mass: 0.6 });
  useEffect(() => raw.set(value), [value, raw]);
  const paint = (v: number) =>
    needleRef.current?.setAttribute('transform', `rotate(${((v - 0.5) * 180).toFixed(3)} ${CX} ${CY})`);
  useMotionValueEvent(spring, 'change', paint);
  useEffect(() => paint(spring.get()), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Shutter: a perforated grille that drops away to reveal the target.
  const shutterY = useMotionValue(open ? R_FACE + 24 : 0);
  useEffect(() => {
    const c = animate(shutterY, open ? R_FACE + 24 : 0, {
      type: 'spring',
      stiffness: open ? 90 : 260,
      damping: open ? 14 : 30,
      delay: open ? 0.15 : 0,
    });
    return () => c.stop();
  }, [open, shutterY]);

  const valueFromEvent = (e: React.PointerEvent | PointerEvent) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return value;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    let theta = Math.atan2(CY - pt.y, pt.x - CX);
    if (theta < 0) theta = pt.x < CX ? Math.PI : 0; // below the pivot: pin to the nearest end
    return Math.min(1, Math.max(0, 1 - theta / Math.PI));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragChange?.(true);
    onChange?.(valueFromEvent(e));
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange?.(valueFromEvent(e));
  };
  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onDragChange?.(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const k = e.key;
    let v: number | null = null;
    if (k === 'ArrowLeft' || k === 'ArrowDown') v = value - step;
    if (k === 'ArrowRight' || k === 'ArrowUp') v = value + step;
    if (k === 'Home') v = 0;
    if (k === 'End') v = 1;
    if (v !== null) {
      e.preventDefault();
      onChange?.(Math.min(1, Math.max(0, v)));
    }
  };

  // Scale ring ticks: 0..100, labelled every 10.
  const ticks = Array.from({ length: 51 }, (_, i) => i / 50);

  return (
    <div dir="ltr" className="relative mx-auto w-full max-w-[640px] select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`block w-full touch-none ${interactive ? 'cursor-grab active:cursor-grabbing' : ''}`}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-disabled={!interactive}
        tabIndex={interactive ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKeyDown}
        style={{ outline: 'none' }}
      >
        <defs>
          <clipPath id={`face-${clipId}`}>
            <path d={HALF} />
          </clipPath>
          <pattern id={`grille-${clipId}`} width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill="#3a352c" />
            <circle cx="4.5" cy="4.5" r="1.9" fill="#1b1813" />
            <circle cx="4.1" cy="4.1" r="0.7" fill="#58503f" />
          </pattern>
          <radialGradient id={`glow-${clipId}`} cx="50%" cy="100%" r="90%">
            <stop offset="0%" stopColor="#3b352a" />
            <stop offset="100%" stopColor="#1f1c16" />
          </radialGradient>
        </defs>

        {/* Cabinet: the outer scale ring */}
        <path
          d={`M${CX - R_RING - 10} ${CY}A${R_RING + 10} ${R_RING + 10} 0 0 1 ${CX + R_RING + 10} ${CY}Z`}
          fill="var(--color-paper-3)"
          stroke="var(--color-ink)"
          strokeWidth="2.5"
        />
        {ticks.map((t, i) => {
          const major = i % 5 === 0;
          const [x1, y1] = polar(t, R_RING + 4);
          const [x2, y2] = polar(t, major ? R_RING - 10 : R_RING - 4);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-ink)" strokeWidth={major ? 2 : 1} />
          );
        })}
        {ticks
          .filter((_, i) => i % 10 === 0 && i > 0 && i < 50)
          .map((t) => {
            const [x, y] = polar(t, R_RING - 19);
            return (
              <text
                key={t}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="DM Mono, monospace"
                fontSize="9"
                fill="var(--color-ink-2)"
              >
                {Math.round(t * 100)}
              </text>
            );
          })}

        {/* Face */}
        <path d={HALF} fill={`url(#glow-${clipId})`} stroke="var(--color-ink)" strokeWidth="2.5" />

        <g clipPath={`url(#face-${clipId})`}>
          {/* Target bands */}
          {target !== null &&
            BANDS.map((b) => (
              <path
                key={b.from}
                d={wedge(target + b.from * BAND, target + b.to * BAND, R_FACE)}
                fill={b.fill}
                stroke="var(--color-face)"
                strokeWidth="1.5"
                opacity={scored != null && scored !== b.pts ? 0.55 : 1}
              />
            ))}
          {target !== null &&
            BANDS.map((b) => {
              const [x, y] = polar(target + ((b.from + b.to) / 2) * BAND, R_FACE - 18);
              return (
                <text
                  key={`t${b.from}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="DM Mono, monospace"
                  fontWeight="500"
                  fontSize="12"
                  fill="var(--color-face)"
                >
                  {b.pts}
                </text>
              );
            })}

          {/* Shutter */}
          <motion.g style={{ y: shutterY }}>
            <path d={HALF} fill={`url(#grille-${clipId})`} />
            <path
              d={`M${CX - R_FACE} ${CY - 2}h${R_FACE * 2}`}
              stroke="var(--color-amber)"
              strokeWidth="3"
              opacity="0.9"
            />
            <rect x={CX - 34} y={CY - 70} width="68" height="18" rx="3" fill="#2a2620" stroke="#4d4537" />
            <text
              x={CX}
              y={CY - 61}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="DM Mono, monospace"
              fontSize="8.5"
              letterSpacing="2"
              fill="var(--color-amber)"
            >
              TUNED·IN
            </text>
          </motion.g>
        </g>

        {/* Needle */}
        <g ref={needleRef}>
          <path
            d={`M${CX - 4} ${CY}L${CX} ${CY - R_FACE + 8}L${CX + 4} ${CY}Z`}
            fill={accent ?? 'var(--color-signal)'}
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d={`M${CX} ${CY - 40}L${CX} ${CY - R_FACE + 14}`} stroke="var(--color-glow)" strokeWidth="1" opacity="0.6" />
        </g>
        {/* Hub */}
        <circle cx={CX} cy={CY} r="15" fill="var(--color-ink)" />
        <circle cx={CX} cy={CY} r="10" fill="var(--color-amber)" stroke="var(--color-ink)" strokeWidth="2" />
        <circle cx={CX - 3} cy={CY - 3} r="2.5" fill="var(--color-glow)" opacity="0.7" />
        {/* Base plate */}
        <rect x={CX - R_RING - 14} y={CY} width={(R_RING + 14) * 2} height={H - CY} fill="var(--color-ink)" rx="2" />
      </svg>
    </div>
  );
}
