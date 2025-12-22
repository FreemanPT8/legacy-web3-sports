import React, { useMemo } from 'react';
import { COUNTRY_MARKERS } from '@/data/country-markers';

type CountryStat = {
  code: string;
  memberCount: number;
};

type Props = {
  stats: CountryStat[];
};

type Ring = [number, number][];

const WIDTH = 1000;
const HEIGHT = 480;

const projectPoint = ([lon, lat]: [number, number]) => {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
  return [x, y] as const;
};

const CONTINENT_RINGS: Ring[] = [
  [
    [-168, 70], [-155, 73], [-140, 70], [-130, 65], [-120, 60],
    [-112, 55], [-108, 50], [-105, 42], [-100, 38], [-95, 33],
    [-90, 28], [-95, 18], [-102, 20], [-110, 23], [-120, 28],
    [-130, 33], [-140, 40], [-150, 48], [-160, 58], [-167, 65],
    [-168, 70],
  ],
  [
    [-55, 82], [-45, 78], [-40, 72], [-44, 68], [-50, 70],
    [-56, 74], [-58, 79], [-55, 82],
  ],
  [
    [-82, 12], [-78, 6], [-75, -5], [-72, -15], [-69, -22],
    [-66, -30], [-65, -38], [-67, -46], [-70, -52], [-75, -55],
    [-79, -50], [-79, -37], [-80, -22], [-81, -10], [-82, 2], [-82, 12],
  ],
  [
    [-11, 36], [-5, 44], [4, 52], [12, 56], [20, 59],
    [30, 60], [38, 58], [45, 52], [52, 46], [52, 40], [46, 36],
    [32, 34], [18, 32], [5, 32], [-4, 34], [-11, 36],
  ],
  [
    [-17, 34], [-10, 33], [0, 32], [10, 30], [18, 26], [26, 20],
    [30, 13], [32, 3], [30, -6], [26, -16], [20, -24], [16, -30],
    [10, -32], [5, -30], [0, -20], [-5, -5], [-10, 10], [-17, 27], [-17, 34],
  ],
  [
    [25, 58], [35, 65], [50, 70], [60, 67], [65, 60], [70, 53],
    [75, 48], [80, 42], [80, 35], [75, 30], [65, 28], [60, 32], [48, 38],
    [38, 42], [32, 48], [28, 52], [25, 58],
  ],
  [
    [50, 32], [58, 28], [68, 26], [78, 30], [90, 32], [102, 30],
    [112, 28], [120, 24], [126, 20], [130, 13], [128, 6], [118, 3],
    [110, 2], [100, 6], [90, 8], [80, 15], [70, 20], [62, 26], [50, 32],
  ],
  [
    [95, 15], [102, 20], [110, 16], [115, 9], [116, 1], [112, -5],
    [104, -6], [98, -2], [95, 8], [95, 15],
  ],
  [
    [105, -10], [120, -11], [133, -15], [140, -22], [145, -30],
    [142, -38], [132, -41], [120, -35], [110, -25], [105, -15], [105, -10],
  ],
  [
    [170, -34], [177, -36], [179, -43], [173, -45], [170, -42], [170, -34],
  ],
  [
    [-178, -62], [-150, -66], [-100, -68], [-50, -70], [0, -72],
    [60, -69], [120, -66], [178, -63], [-178, -62],
  ],
];

export function WorldPresenceMap({ stats }: Props) {
  const statLookup = useMemo(() => {
    return stats.reduce<Record<string, number>>((acc, stat) => {
      acc[stat.code.toUpperCase()] = stat.memberCount;
      return acc;
    }, {});
  }, [stats]);

  const getPath = (ring: Ring) =>
    ring
      .map(([lon, lat], index) => {
        const [x, y] = projectPoint([lon, lat]);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ') + ' Z';

  return (
    <div className="rounded-[32px] border border-white/10 bg-[#010f17] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="World presence map"
      >
        <defs>
          <linearGradient id="map-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#031624" />
            <stop offset="100%" stopColor="#010811" />
          </linearGradient>
          <linearGradient id="grid-line" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0d3250" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0b1f2d" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="url(#map-bg)" rx={32} />

        {Array.from({ length: 6 }, (_, index) => {
          const x = ((index + 1) / 7) * WIDTH;
          return (
            <line
              key={`meridian-${index}`}
              x1={x}
              x2={x}
              y1={0}
              y2={HEIGHT}
              stroke="url(#grid-line)"
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: 4 }, (_, index) => {
          const y = ((index + 1) / 5) * HEIGHT;
          return (
            <line
              key={`parallel-${index}`}
              x1={0}
              x2={WIDTH}
              y1={y}
              y2={y}
              stroke="url(#grid-line)"
              strokeWidth={1}
            />
          );
        })}

        {CONTINENT_RINGS.map((ring, idx) => (
          <path
            key={`continent-${idx}`}
            d={getPath(ring)}
            fill="rgba(5, 66, 95, 0.75)"
            stroke="rgba(8, 97, 132, 0.85)"
            strokeWidth={1.2}
          />
        ))}

        {COUNTRY_MARKERS.map((marker) => {
          const members = statLookup[marker.code.toUpperCase()] ?? 0;
          if (members <= 0) return null;
          const [x, y] = projectPoint([marker.lon, marker.lat]);
          const fill = members >= 50 ? '#fbbf24' : '#34d4f5';
          return (
            <g key={marker.code} transform={`translate(${x}, ${y})`}>
              <circle r={12} fill={fill} opacity={0.18} />
              <circle r={5} fill={fill} stroke={fill} strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#fbbf24]" />
          <span>≥ 50 membros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#34d4f5]" />
          <span>1-49 membros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#042030]" />
          <span>Sem membros ainda</span>
        </div>
      </div>
    </div>
  );
}
