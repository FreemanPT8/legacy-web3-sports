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
        [-150, 71],
        [-130, 65],
        [-115, 58],
        [-100, 52],
        [-95, 45],
        [-90, 35],
        [-100, 25],
        [-112, 20],
        [-130, 25],
        [-145, 35],
        [-156, 50],
        [-168, 60],
        [-168, 72],
      ],
    ],
  },
  {
    id: 'south-america',
    rings: [
      [
        [-82, 13],
        [-74, 5],
        [-70, -5],
        [-60, -10],
        [-55, -20],
        [-60, -35],
        [-67, -50],
        [-73, -55],
        [-78, -45],
        [-82, -25],
        [-83, -5],
        [-82, 13],
      ],
    ],
  },
  {
    id: 'eurafrica',
    rings: [
      [
        [-15, 35],
        [0, 60],
        [20, 65],
        [40, 70],
        [55, 60],
        [60, 45],
        [52, 30],
        [40, 20],
        [30, 10],
        [25, -5],
        [15, -25],
        [5, -35],
        [-10, -30],
        [-15, -5],
        [-15, 35],
      ],
    ],
  },
  {
    id: 'asia',
    rings: [
      [
        [20, 60],
        [35, 75],
        [70, 75],
        [115, 65],
        [150, 60],
        [150, 45],
        [130, 25],
        [115, 5],
        [100, -5],
        [80, -5],
        [60, 5],
        [45, 20],
        [30, 35],
        [20, 60],
      ],
    ],
  },
  {
    id: 'australia',
    rings: [
      [
        [110, -10],
        [150, -10],
        [155, -25],
        [148, -35],
        [135, -40],
        [125, -35],
        [115, -20],
        [110, -10],
      ],
    ],
  },
  {
    id: 'antarctica',
    rings: [
      [
        [-180, -60],
        [-130, -70],
        [-60, -75],
        [0, -78],
        [60, -75],
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
