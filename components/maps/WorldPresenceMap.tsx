import React, { useMemo } from 'react';
import { COUNTRY_MARKERS } from '@/data/country-markers';

type CountryStat = {
  code: string;
  memberCount: number;
};

type Props = {
  stats: CountryStat[];
};

const WIDTH = 1000;
const HEIGHT = 480;

const projectPoint = ([lon, lat]: [number, number]) => {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
  return [x, y] as const;
};

type Ring = [number, number][];

const CONTINENT_RINGS: Ring[] = [
  [
    [-168, 72], [-160, 71], [-150, 66], [-140, 60], [-135, 53],
    [-125, 48], [-115, 42], [-110, 35], [-105, 25], [-100, 18],
    [-95, 15], [-90, 18], [-85, 23], [-80, 28], [-75, 32],
    [-78, 38], [-82, 43], [-85, 48], [-90, 54], [-100, 60],
    [-110, 65], [-125, 70], [-140, 73], [-155, 74], [-168, 72],
  ],
  [
    [-55, 83], [-40, 78], [-35, 73], [-40, 68], [-47, 70],
    [-55, 75], [-58, 80], [-55, 83],
  ],
  [
    [-82, 13], [-78, 8], [-74, 4], [-70, -5], [-65, -15],
    [-63, -23], [-65, -33], [-70, -45], [-75, -55], [-80, -50],
    [-80, -35], [-79, -15], [-82, -2], [-82, 13],
  ],
  [
    [-10, 36], [-5, 43], [5, 50], [15, 55], [25, 60],
    [35, 62], [45, 60], [55, 55], [60, 50], [55, 45],
    [45, 40], [30, 37], [20, 35], [5, 33], [-5, 34], [-10, 36],
  ],
  [
    [-17, 32], [-5, 32], [10, 28], [20, 20], [30, 10],
    [35, 0], [32, -10], [30, -20], [25, -30], [20, -35],
    [10, -35], [5, -25], [0, -10], [-5, 5], [-10, 15], [-15, 25], [-17, 32],
  ],
  [
    [30, 33], [40, 30], [52, 27], [58, 24], [55, 18],
    [50, 16], [45, 20], [38, 25], [34, 30], [30, 33],
  ],
  [
    [25, 60], [40, 65], [55, 65], [70, 60], [80, 55], [95, 50],
    [110, 45], [125, 37], [135, 28], [138, 18], [132, 10],
    [120, 4], [105, 6], [90, 12], [75, 20], [60, 26],
    [50, 32], [40, 40], [32, 50], [28, 55], [25, 60],
  ],
  [
    [70, 25], [78, 28], [83, 22], [86, 18], [85, 10],
    [80, 5], [75, 8], [72, 15], [70, 25],
  ],
  [
    [95, 10], [105, 12], [110, 5], [115, 0], [120, -5],
    [118, -10], [110, -12], [105, -10], [98, -5], [95, 0], [95, 10],
  ],
  [
    [110, -10], [120, -12], [130, -18], [140, -25], [145, -32],
    [138, -39], [125, -38], [115, -30], [110, -20], [110, -10],
  ],
  [
    [170, -35], [175, -40], [170, -45], [166, -43], [168, -37], [170, -35],
  ],
  [
    [-180, -60], [-150, -65], [-100, -68], [-50, -70],
    [0, -72], [60, -70], [120, -67], [180, -62], [-180, -60],
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
            <stop offset="0%" stopColor="#021424" />
            <stop offset="100%" stopColor="#010911" />
          </linearGradient>
          <linearGradient id="grid-line" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0d2d3f" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0b1d2a" stopOpacity="0.08" />
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
            fill="rgba(6, 56, 80, 0.7)"
            stroke="rgba(11, 67, 93, 0.9)"
            strokeWidth={1}
          />
        ))}

        {COUNTRY_MARKERS.map((marker) => {
          const members = statLookup[marker.code.toUpperCase()] ?? 0;
          if (members <= 0) return null;
          const [x, y] = projectPoint([marker.lon, marker.lat]);
          const fill = members >= 50 ? '#fbbf24' : '#37d6f3';
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
          <span className="inline-block h-3 w-3 rounded-full bg-[#37d6f3]" />
          <span>1-49 membros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#04212f]" />
          <span>Sem membros ainda</span>
        </div>
      </div>
    </div>
  );
}
