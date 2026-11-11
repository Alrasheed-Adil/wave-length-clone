// Twelve hand-built avatars: geometric bodies with small, expressive faces.
// All drawn on a 64×64 grid with the same ink stroke so they read as one set.

type Eyes = 'dots' | 'wide' | 'sleepy' | 'cyclops' | 'specs' | 'wink' | 'stars';
type Mouth = 'smile' | 'o' | 'flat' | 'grin' | 'tongue' | 'smirk';

interface Spec {
  bg: string;
  body: string; // fill
  shape: (props: { fill: string }) => React.ReactElement;
  eyes: Eyes;
  mouth: Mouth;
  extra?: () => React.ReactElement;
}

const INK = '#1D1A15';
const S = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

const shapes = {
  circle: ({ fill }: { fill: string }) => <circle cx="32" cy="34" r="20" fill={fill} {...S} />,
  square: ({ fill }: { fill: string }) => <rect x="13" y="15" width="38" height="38" rx="7" fill={fill} {...S} />,
  tri: ({ fill }: { fill: string }) => <path d="M32 10 54 52H10Z" fill={fill} {...S} />,
  hex: ({ fill }: { fill: string }) => <path d="M32 12 51 23V45L32 56 13 45V23Z" fill={fill} {...S} />,
  blob: ({ fill }: { fill: string }) => (
    <path d="M33 13c11 0 20 7 20 19 0 13-8 22-21 22-12 0-21-7-21-19 0-11 9-22 22-22Z" fill={fill} {...S} />
  ),
  diamond: ({ fill }: { fill: string }) => <path d="M32 9 55 33 32 57 9 33Z" fill={fill} {...S} />,
  ghost: ({ fill }: { fill: string }) => (
    <path d="M13 54V32a19 19 0 0 1 38 0v22l-6-5-6 5-7-5-7 5-6-5Z" fill={fill} {...S} />
  ),
  burst: ({ fill }: { fill: string }) => (
    <path
      d="M32 9l6 9 10-3-1 11 9 6-9 6 1 11-10-3-6 9-6-9-10 3 1-11-9-6 9-6-1-11 10 3Z"
      fill={fill}
      {...S}
    />
  ),
  pill: ({ fill }: { fill: string }) => <rect x="8" y="20" width="48" height="28" rx="14" fill={fill} {...S} />,
  cloud: ({ fill }: { fill: string }) => (
    <path
      d="M18 50c-6 0-10-4-10-9s4-9 9-9c1-8 7-14 15-14 7 0 13 5 14 12 6 0 10 5 10 10s-4 10-10 10Z"
      fill={fill}
      {...S}
    />
  ),
  drop: ({ fill }: { fill: string }) => <path d="M32 8C40 22 51 31 51 41a19 19 0 0 1-38 0c0-10 11-19 19-33Z" fill={fill} {...S} />,
  radio: ({ fill }: { fill: string }) => (
    <g>
      <path d="M22 18 14 8M42 18l8-10" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="8" r="2.5" fill={INK} />
      <circle cx="50" cy="8" r="2.5" fill={INK} />
      <rect x="9" y="18" width="46" height="36" rx="6" fill={fill} {...S} />
    </g>
  ),
};

const SPECS: Spec[] = [
  { bg: '#E04E1B', body: '#F4EBD6', shape: shapes.circle, eyes: 'dots', mouth: 'smile' },
  { bg: '#22586A', body: '#F0A92B', shape: shapes.square, eyes: 'specs', mouth: 'flat' },
  { bg: '#F0A92B', body: '#E04E1B', shape: shapes.tri, eyes: 'cyclops', mouth: 'o' },
  { bg: '#5F6D28', body: '#E7D3A0', shape: shapes.hex, eyes: 'sleepy', mouth: 'smirk' },
  { bg: '#E7D3A0', body: '#22586A', shape: shapes.blob, eyes: 'wide', mouth: 'grin' },
  { bg: '#23201A', body: '#F0A92B', shape: shapes.diamond, eyes: 'wink', mouth: 'tongue' },
  { bg: '#C8431A', body: '#F4EBD6', shape: shapes.ghost, eyes: 'wide', mouth: 'o' },
  { bg: '#22586A', body: '#E7D3A0', shape: shapes.burst, eyes: 'stars', mouth: 'grin' },
  { bg: '#F4EBD6', body: '#5F6D28', shape: shapes.pill, eyes: 'dots', mouth: 'flat' },
  { bg: '#F0A92B', body: '#F4EBD6', shape: shapes.cloud, eyes: 'sleepy', mouth: 'smile' },
  { bg: '#5F6D28', body: '#E04E1B', shape: shapes.drop, eyes: 'cyclops', mouth: 'smirk' },
  { bg: '#E7D3A0', body: '#23201A', shape: shapes.radio, eyes: 'specs', mouth: 'grin' },
];

export const AVATAR_COUNT = SPECS.length;

function EyesFor({ kind, dark }: { kind: Eyes; dark: boolean }) {
  const c = dark ? '#F4EBD6' : INK;
  switch (kind) {
    case 'dots':
      return (
        <g fill={c}>
          <circle cx="25" cy="32" r="2.6" />
          <circle cx="39" cy="32" r="2.6" />
        </g>
      );
    case 'wide':
      return (
        <g>
          <circle cx="25" cy="31" r="5" fill="#F4EBD6" stroke={INK} strokeWidth="2" />
          <circle cx="39" cy="31" r="5" fill="#F4EBD6" stroke={INK} strokeWidth="2" />
          <circle cx="26" cy="32" r="2" fill={INK} />
          <circle cx="40" cy="32" r="2" fill={INK} />
        </g>
      );
    case 'sleepy':
      return (
        <g stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M21 32q4 3 8 0M35 32q4 3 8 0" />
        </g>
      );
    case 'cyclops':
      return (
        <g>
          <circle cx="32" cy="33" r="7" fill="#F4EBD6" stroke={INK} strokeWidth="2" />
          <circle cx="33" cy="34" r="3" fill={INK} />
        </g>
      );
    case 'specs':
      return (
        <g stroke={c} strokeWidth="2.2" fill="none">
          <circle cx="25" cy="32" r="5" />
          <circle cx="39" cy="32" r="5" />
          <path d="M30 32h4" />
          <circle cx="25" cy="32" r="1.6" fill={c} />
          <circle cx="39" cy="32" r="1.6" fill={c} />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="25" cy="33" r="2.6" fill={c} />
          <path d="M35 33h8" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'stars':
      return (
        <g fill={c}>
          <path d="M25 27l1.5 3.5L30 32l-3.5 1.5L25 37l-1.5-3.5L20 32l3.5-1.5Z" />
          <path d="M39 27l1.5 3.5L44 32l-3.5 1.5L39 37l-1.5-3.5L34 32l3.5-1.5Z" />
        </g>
      );
  }
}

function MouthFor({ kind, dark }: { kind: Mouth; dark: boolean }) {
  const c = dark ? '#F4EBD6' : INK;
  const p = { stroke: c, strokeWidth: 2.5, strokeLinecap: 'round' as const, fill: 'none' };
  switch (kind) {
    case 'smile':
      return <path d="M26 40q6 5 12 0" {...p} />;
    case 'o':
      return <ellipse cx="32" cy="42" rx="3" ry="3.6" fill={c} />;
    case 'flat':
      return <path d="M27 42h10" {...p} />;
    case 'grin':
      return <path d="M25 39h14q-1 7-7 7t-7-7Z" fill="#F4EBD6" stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
    case 'tongue':
      return (
        <g>
          <path d="M26 40q6 4 12 0" {...p} />
          <path d="M31 42h5v3a2.5 2.5 0 0 1-5 0Z" fill="#E04E1B" stroke={INK} strokeWidth="1.5" />
        </g>
      );
    case 'smirk':
      return <path d="M27 42q5 1 10-3" {...p} />;
  }
}

export function Avatar({ id, size = 48, ring, fluid }: { id: number; size?: number; ring?: string; fluid?: boolean }) {
  const spec = SPECS[((id % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT];
  const dark = spec.body === '#23201A' || spec.body === '#22586A' || spec.body === '#5F6D28';
  const Shape = spec.shape;
  return (
    <svg
      width={fluid ? '100%' : size}
      height={fluid ? undefined : size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{
        borderRadius: 12,
        boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
        flex: 'none',
        display: 'block',
        aspectRatio: '1',
      }}
    >
      <rect width="64" height="64" rx="12" fill={spec.bg} />
      <rect x="1.25" y="1.25" width="61.5" height="61.5" rx="11" fill="none" stroke={INK} strokeWidth="2.5" />
      <Shape fill={spec.body} />
      <EyesFor kind={spec.eyes} dark={dark} />
      <MouthFor kind={spec.mouth} dark={dark} />
    </svg>
  );
}
