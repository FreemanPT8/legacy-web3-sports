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
    [-168, 70], [-158, 72], [-148, 73], [-135, 70], [-128, 64],
    [-118, 60], [-110, 55], [-106, 50], [-104, 44], [-101, 38],
    [-99, 32], [-96, 25], [-93, 19], [-90, 15], [-85, 18],
    [-82, 24], [-80, 30], [-78, 35], [-75, 40], [-72, 45],
    [-70, 50], [-68, 55], [-70, 60], [-76, 64], [-84, 68],
    [-95, 70], [-108, 71], [-120, 74], [-135, 75], [-150, 74],
    [-160, 72], [-168, 70],
  ],
  [
    [-55, 82], [-46, 78], [-43, 73], [-45, 70], [-50, 71],
    [-55, 74], [-58, 78], [-55, 82],
  ],
  [
    [-82, 12], [-78, 7], [-75, -2], [-72, -10], [-70, -18],
    [-68, -26], [-67, -35], [-68, -42], [-71, -48], [-74, -53],
    [-77, -55], [-79, -48], [-80, -40], [-80, -30], [-81, -20],
    [-82, -10], [-82, 0], [-82, 12],
  ],
  [
    [-11, 36], [-6, 41], [-2, 45], [4, 49], [12, 54], [20, 58],
    [30, 60], [38, 58], [46, 53], [52, 47], [55, 42],
    [53, 37], [45, 33], [32, 31], [20, 30], [8, 31], [0, 33], [-11, 36],
  ],
  [
    [-17, 34], [-10, 33], [-2, 32], [6, 31], [14, 28], [22, 24],
    [29, 18], [32, 10], [33, 2], [31, -7], [26, -16], [20, -24],
    [15, -30], [10, -34], [4, -33], [0, -24], [-4, -12], [-8, 0],
    [-12, 15], [-17, 27], [-17, 34],
  ],
  [
    [24, 58], [32, 63], [40, 66], [48, 68], [57, 67], [63, 63],
    [67, 58], [70, 52], [72, 46], [70, 40], [65, 36], [58, 34],
    [50, 35], [42, 38], [34, 42], [28, 48], [24, 58],
  ],
  [
    [50, 32], [60, 30], [70, 28], [80, 30], [90, 32], [100, 33],
    [110, 32], [120, 29], [125, 24], [127, 18], [126, 10], [120, 6],
    [112, 4], [103, 5], [94, 8], [85, 12], [75, 18], [64, 24], [50, 32],
  ],
  [
    [96, 16], [103, 18], [108, 15], [112, 10], [114, 4],
    [113, -2], [108, -5], [101, -4], [96, 2], [96, 16],
  ],
  [
    [105, -10], [118, -11], [128, -16], [136, -22], [140, -29],
    [138, -35], [132, -38], [123, -36], [114, -30], [106, -22], [105, -10],
  ],
  [
    [170, -34], [176, -36], [178, -40], [175, -44], [170, -42], [170, -34],
  ],
  [
    [-178, -62], [-150, -64], [-110, -66], [-70, -68], [-30, -69],
    [10, -70], [60, -69], [110, -67], [160, -64], [178, -63], [-178, -62],
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
