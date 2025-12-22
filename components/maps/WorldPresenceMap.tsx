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

type Shape = {
  id: string;
  rings: [number, number][][];
};

const CONTINENT_SHAPES: Shape[] = [
  {
    id: 'north-america',
    rings: [
      [
        [-168, 72],
        [-160, 70],
        [-150, 66],
        [-140, 62],
        [-132, 58],
        [-125, 53],
        [-118, 47],
        [-110, 42],
        [-105, 35],
        [-100, 30],
        [-90, 27],
        [-82, 23],
        [-85, 18],
        [-94, 15],
        [-110, 16],
        [-122, 20],
        [-133, 28],
        [-140, 32],
        [-150, 40],
        [-160, 50],
        [-167, 60],
        [-168, 72],
      ],
    ],
  },
  {
    id: 'greenland',
    rings: [
      [
        [-52, 83],
        [-40, 80],
        [-33, 75],
        [-37, 70],
        [-45, 66],
        [-52, 68],
        [-58, 72],
        [-60, 77],
        [-52, 83],
      ],
    ],
  },
  {
    id: 'south-america',
    rings: [
      [
        [-82, 13],
        [-78, 5],
        [-74, -2],
        [-68, -8],
        [-63, -15],
        [-60, -22],
        [-60, -32],
        [-63, -42],
        [-67, -52],
        [-72, -55],
        [-76, -50],
        [-78, -40],
        [-80, -25],
        [-82, -10],
        [-82, 13],
      ],
    ],
  },
  {
    id: 'europe',
    rings: [
      [
        [-10, 35],
        [-5, 45],
        [5, 55],
        [15, 60],
        [25, 63],
        [30, 58],
        [35, 52],
        [35, 46],
        [30, 42],
        [20, 40],
        [10, 38],
        [0, 37],
        [-10, 35],
      ],
    ],
  },
  {
    id: 'africa',
    rings: [
      [
        [-17, 30],
        [-5, 30],
        [10, 25],
        [25, 20],
        [35, 10],
        [40, -5],
        [38, -20],
        [30, -30],
        [18, -35],
        [10, -30],
        [5, -20],
        [0, -5],
        [-5, 5],
        [-10, 15],
        [-15, 25],
        [-17, 30],
      ],
    ],
  },
  {
    id: 'asia-west',
    rings: [
      [
        [25, 60],
        [40, 65],
        [55, 65],
        [65, 58],
        [70, 50],
        [60, 45],
        [50, 40],
        [45, 35],
        [35, 35],
        [28, 40],
        [25, 50],
        [25, 60],
      ],
    ],
  },
  {
    id: 'asia-east',
    rings: [
      [
        [60, 55],
        [75, 60],
        [95, 58],
        [110, 52],
        [125, 45],
        [135, 35],
        [135, 25],
        [125, 15],
        [115, 10],
        [100, 12],
        [90, 18],
        [80, 28],
        [70, 40],
        [62, 50],
        [60, 55],
      ],
    ],
  },
  {
    id: 'india-sea',
    rings: [
      [
        [60, 25],
        [70, 25],
        [80, 20],
        [85, 12],
        [85, 5],
        [75, 8],
        [70, 12],
        [63, 18],
        [60, 25],
      ],
    ],
  },
  {
    id: 'southeast-asia',
    rings: [
      [
        [95, 15],
        [105, 20],
        [112, 15],
        [118, 7],
        [118, 0],
        [110, -5],
        [100, -3],
        [95, 5],
        [95, 15],
      ],
    ],
  },
  {
    id: 'australia',
    rings: [
      [
        [110, -10],
        [125, -10],
        [140, -15],
        [150, -25],
        [146, -35],
        [135, -38],
        [125, -32],
        [115, -25],
        [110, -10],
      ],
    ],
  },
  {
    id: 'antarctica',
    rings: [
      [
        [-180, -60],
        [-140, -65],
        [-100, -70],
        [-50, -72],
        [0, -74],
        [60, -73],
        [120, -70],
        [180, -65],
        [-180, -60],
      ],
    ],
  },
];

const getColor = (members: number) => {
  if (members >= 50) return '#fbbf24';
  if (members > 0) return '#06b6d4';
  return '#1b2d38';
};

export function WorldPresenceMap({ stats }: Props) {
  const statLookup = useMemo(() => {
    return stats.reduce<Record<string, number>>((acc, stat) => {
      acc[stat.code.toUpperCase()] = stat.memberCount;
      return acc;
    }, {});
  }, [stats]);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#010f17] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="World presence map"
      >
        <defs>
          <linearGradient id="map-glow" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#072033" />
            <stop offset="100%" stopColor="#010b14" />
          </linearGradient>
          <linearGradient id="grid-line" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0d2838" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0d2838" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="url(#map-glow)" rx={32} />

        {CONTINENT_SHAPES.map((shape) => (
          <path
            key={shape.id}
            d={shape.rings
              .map((ring) =>
                ring
                  .map(([lon, lat], index) => {
                    const [x, y] = projectPoint([lon, lat]);
                    return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
                  })
                  .join(' ') + ' Z',
              )
              .join(' ')}
            fill="#051c29"
            stroke="#0b2a3b"
            strokeWidth={1}
            opacity={0.75}
          />
        ))}

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
        {Array.from({ length: 3 }, (_, index) => {
          const y = ((index + 1) / 4) * HEIGHT;
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

        {COUNTRY_MARKERS.map((marker) => {
          const [x, y] = projectPoint([marker.lon, marker.lat]);
          const members = statLookup[marker.code.toUpperCase()] ?? 0;
          const fill = getColor(members);
          const active = members > 0;
          return (
            <g key={marker.code} transform={`translate(${x}, ${y})`}>
              {active && (
                <circle r={12} fill={fill} opacity={0.18} />
              )}
              <circle
                r={active ? 5 : 4}
                fill={fill}
                stroke={active ? fill : '#13222c'}
                strokeWidth={active ? 2 : 1}
              />
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
          <span className="inline-block h-3 w-3 rounded-full bg-[#06b6d4]" />
          <span>1-49 membros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#1b2d38]" />
          <span>Sem membros ainda</span>
        </div>
      </div>
    </div>
  );
}
