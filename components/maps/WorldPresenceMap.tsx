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

const CONTINENT_SHAPES: { id: string; rings: Ring[] }[] = [
  {
    id: 'north-america',
    rings: [
      [
        [-168, 72], [-158, 74], [-146, 74], [-132, 70], [-124, 66],
        [-118, 62], [-113, 57], [-110, 52], [-108, 46], [-105, 40],
        [-102, 34], [-99, 30], [-96, 25], [-93, 20], [-89, 17],
        [-84, 20], [-78, 26], [-73, 33], [-69, 40], [-66, 46],
        [-66, 52], [-70, 58], [-76, 63], [-84, 67], [-94, 70],
        [-108, 72], [-122, 73], [-137, 75], [-150, 75], [-162, 73], [-168, 72],
      ],
    ],
  },
  {
    id: 'central-america',
    rings: [
      [
        [-105, 23], [-100, 20], [-95, 18], [-90, 17], [-86, 18],
        [-84, 22], [-86, 26], [-92, 28], [-99, 26], [-105, 23],
      ],
    ],
  },
  {
    id: 'greenland',
    rings: [
      [
        [-55, 82], [-48, 79], [-44, 73], [-46, 69], [-52, 70],
        [-58, 73], [-60, 77], [-55, 82],
      ],
    ],
  },
  {
    id: 'south-america',
    rings: [
      [
        [-82, 12], [-78, 6], [-75, 0], [-73, -8], [-71, -15],
        [-69, -23], [-67, -30], [-67, -38], [-70, -45], [-73, -52],
        [-77, -55], [-81, -53], [-83, -45], [-83, -32], [-82, -18],
        [-82, -6], [-82, 2], [-82, 12],
      ],
    ],
  },
  {
    id: 'europe',
    rings: [
      [
        [-10, 37], [-5, 42], [0, 48], [7, 54], [15, 58],
        [25, 60], [35, 61], [45, 57], [52, 50], [55, 44],
        [52, 38], [44, 34], [30, 32], [18, 31], [6, 32], [-10, 37],
      ],
    ],
  },
  {
    id: 'uk',
    rings: [
      [
        [-7, 58], [-4, 55], [-3, 52], [-5, 50], [-7, 52], [-7, 58],
      ],
    ],
  },
  {
    id: 'africa',
    rings: [
      [
        [-18, 33], [-10, 32], [-2, 30], [8, 29], [16, 26], [24, 21],
        [29, 16], [31, 8], [30, -2], [26, -14], [21, -24],
        [15, -32], [8, -36], [2, -33], [-4, -25], [-7, -10],
        [-9, 4], [-13, 17], [-18, 27], [-18, 33],
      ],
    ],
  },
  {
    id: 'eurasia-north',
    rings: [
      [
        [18, 58], [28, 66], [42, 72], [58, 75], [74, 74],
        [90, 70], [106, 64], [120, 58], [130, 52], [136, 45],
        [138, 36], [136, 30], [130, 26], [120, 24], [110, 26],
        [98, 28], [88, 32], [78, 37], [68, 42], [60, 46],
        [50, 48], [40, 47], [32, 45], [25, 48], [21, 52], [18, 58],
      ],
    ],
  },
  {
    id: 'middle-east',
    rings: [
      [
        [25, 32], [35, 33], [45, 34], [52, 32], [56, 28],
        [52, 24], [44, 22], [34, 23], [28, 27], [25, 32],
      ],
    ],
  },
  {
    id: 'south-asia',
    rings: [
      [
        [60, 32], [66, 30], [74, 28], [82, 26], [90, 22],
        [96, 18], [100, 12], [102, 6], [96, 4], [88, 6],
        [80, 10], [72, 16], [64, 24], [60, 32],
      ],
    ],
  },
  {
    id: 'india',
    rings: [
      [
        [70, 26], [78, 24], [84, 21], [88, 15], [86, 8],
        [80, 8], [74, 12], [70, 18], [70, 26],
      ],
    ],
  },
  {
    id: 'se-asia',
    rings: [
      [
        [98, 12], [104, 14], [110, 12], [114, 8],
        [112, 2], [106, 0], [100, 2], [98, 8], [98, 12],
      ],
    ],
  },
  {
    id: 'indonesia-west',
    rings: [
      [
        [108, 0], [112, 2], [116, 0], [115, -4], [108, -4], [106, -1], [108, 0],
      ],
    ],
  },
  {
    id: 'indonesia-east',
    rings: [
      [
        [116, -4], [122, -3], [126, -5], [128, -8], [124, -12], [118, -11], [116, -4],
      ],
    ],
  },
  {
    id: 'philippines',
    rings: [
      [
        [118, 14], [121, 16], [124, 14], [123, 10], [120, 10], [118, 14],
      ],
    ],
  },
  {
    id: 'japan',
    rings: [
      [
        [136, 35], [140, 39], [142, 42], [144, 37], [142, 33], [138, 32], [136, 35],
      ],
    ],
  },
  {
    id: 'australia',
    rings: [
      [
        [110, -10], [122, -12], [133, -16], [140, -22], [145, -30],
        [140, -37], [130, -40], [118, -34], [110, -25], [108, -16], [110, -10],
      ],
    ],
  },
  {
    id: 'new-zealand',
    rings: [
      [
        [170, -35], [174, -37], [176, -42], [172, -45], [169, -42], [170, -35],
      ],
    ],
  },
  {
    id: 'madagascar',
    rings: [
      [
        [48, -16], [50, -18], [51, -22], [49, -24], [46, -22], [46, -18], [48, -16],
      ],
    ],
  },
  {
    id: 'antarctica',
    rings: [
      [
        [-180, -62], [-150, -63], [-110, -65], [-70, -66], [-30, -67],
        [10, -68], [50, -67], [90, -65], [130, -64], [170, -63], [180, -63], [-180, -62],
      ],
    ],
  },
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
            <stop offset="0%" stopColor="#031626" />
            <stop offset="100%" stopColor="#010910" />
          </linearGradient>
          <linearGradient id="grid-line" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0d3046" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0a1e2c" stopOpacity="0.08" />
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

        {CONTINENT_SHAPES.map((shape) =>
          shape.rings.map((ring, idx) => (
            <path
              key={`${shape.id}-${idx}`}
              d={getPath(ring)}
              fill="rgba(5, 73, 104, 0.78)"
              stroke="rgba(21, 164, 187, 0.4)"
              strokeWidth={1.2}
            />
          )),
        )}

        {COUNTRY_MARKERS.map((marker) => {
          const members = statLookup[marker.code.toUpperCase()] ?? 0;
          if (members <= 0) return null;
          const [x, y] = projectPoint([marker.lon, marker.lat]);
          const fill = members >= 50 ? '#fbbf24' : '#36d4f5';
          return (
            <g key={marker.code} transform={`translate(${x}, ${y})`}>
              <circle r={12} fill={fill} opacity={0.2} />
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
          <span className="inline-block h-3 w-3 rounded-full bg-[#36d4f5]" />
          <span>1-49 membros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#052536]" />
          <span>Sem membros ainda</span>
        </div>
      </div>
    </div>
  );
}
