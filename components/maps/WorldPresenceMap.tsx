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
        [-170, 72], [-160, 74], [-149, 73], [-138, 71], [-130, 68], [-125, 64], [-123, 60], [-124, 54],
        [-126, 50], [-126, 46], [-124, 42], [-120, 38], [-116, 34], [-112, 32], [-108, 30], [-104, 29],
        [-100, 28], [-96, 27], [-92, 25], [-90, 23], [-88, 25], [-86, 27], [-84, 29], [-82, 31], [-80, 34],
        [-78, 37], [-76, 40], [-74, 44], [-72, 48], [-72, 52], [-73, 56], [-76, 60], [-80, 63], [-86, 66],
        [-94, 68], [-104, 70], [-116, 72], [-132, 73], [-146, 74], [-158, 74], [-170, 72],
      ],
    ],
  },
  {
    id: 'central-america',
    rings: [
      [
        [-104, 24], [-100, 23], [-96, 22], [-92, 20], [-88, 18], [-86, 16],
        [-86, 14], [-88, 13], [-92, 14], [-96, 16], [-100, 19], [-103, 22], [-104, 24],
      ],
    ],
  },
  {
    id: 'greenland',
    rings: [
      [
        [-74, 82], [-68, 81], [-62, 79], [-56, 75], [-54, 72], [-56, 68],
        [-60, 66], [-66, 67], [-72, 70], [-75, 74], [-74, 82],
      ],
    ],
  },
  {
    id: 'south-america',
    rings: [
      [
        [-82, 12], [-78, 8], [-76, 4], [-74, 0], [-72, -4], [-70, -8], [-68, -12], [-66, -16],
        [-64, -20], [-62, -24], [-60, -28], [-60, -32], [-61, -36], [-63, -40], [-65, -44], [-67, -48],
        [-69, -52], [-71, -55], [-73, -56], [-74, -52], [-75, -46], [-76, -40], [-77, -34], [-78, -28],
        [-79, -22], [-80, -16], [-81, -10], [-81, -4], [-81, 2], [-82, 8], [-82, 12],
      ],
    ],
  },
  {
    id: 'africa',
    rings: [
      [
        [-17, 34], [-10, 34], [-4, 32], [2, 30], [8, 28], [14, 26], [18, 22], [22, 18],
        [26, 12], [28, 6], [28, 0], [26, -6], [24, -12], [21, -18], [18, -24], [14, -30],
        [10, -34], [6, -36], [2, -34], [-2, -28], [-5, -20], [-7, -12], [-10, -2], [-12, 8],
        [-15, 18], [-17, 28], [-17, 34],
      ],
    ],
  },
  {
    id: 'eurasia',
    rings: [
      [
        [-10, 36], [-6, 40], [-2, 44], [4, 48], [10, 52], [18, 56], [28, 60], [40, 63],
        [52, 66], [64, 68], [78, 69], [92, 69], [106, 67], [120, 64], [134, 60], [148, 62],
        [160, 65], [172, 66], [178, 63], [180, 58], [176, 52], [168, 46], [156, 42], [144, 38],
        [134, 34], [126, 32], [118, 30], [108, 29], [96, 30], [84, 32], [72, 32], [60, 30],
        [48, 28], [38, 26], [28, 24], [18, 22], [10, 22], [2, 24], [-4, 28], [-8, 32], [-10, 36],
      ],
    ],
  },
  {
    id: 'arabia',
    rings: [
      [
        [30, 32], [36, 34], [44, 34], [48, 30], [50, 26], [48, 22],
        [42, 20], [36, 22], [32, 26], [30, 32],
      ],
    ],
  },
  {
    id: 'india',
    rings: [
      [
        [70, 26], [76, 25], [82, 23], [86, 19], [86, 14],
        [82, 12], [78, 12], [74, 16], [70, 20], [70, 26],
      ],
    ],
  },
  {
    id: 'se-asia',
    rings: [
      [
        [94, 14], [100, 16], [106, 16], [112, 14], [114, 10],
        [110, 6], [104, 4], [98, 6], [94, 10], [94, 14],
      ],
    ],
  },
  {
    id: 'indonesia-west',
    rings: [
      [
        [104, 4], [110, 6], [116, 6], [118, 2],
        [116, -2], [110, -2], [106, 0], [104, 4],
      ],
    ],
  },
  {
    id: 'indonesia-east',
    rings: [
      [
        [118, -2], [124, -2], [130, -4], [134, -6], [134, -10],
        [128, -12], [122, -12], [118, -8], [118, -2],
      ],
    ],
  },
  {
    id: 'philippines',
    rings: [
      [
        [120, 18], [122, 20], [125, 19], [126, 16], [124, 14], [121, 14], [120, 18],
      ],
    ],
  },
  {
    id: 'japan',
    rings: [
      [
        [138, 34], [140, 38], [144, 40], [146, 36], [144, 32], [140, 31], [138, 34],
      ],
    ],
  },
  {
    id: 'australia',
    rings: [
      [
        [112, -12], [118, -16], [124, -18], [132, -22], [136, -26], [138, -32],
        [134, -36], [126, -38], [118, -36], [112, -30], [110, -22], [112, -12],
      ],
    ],
  },
  {
    id: 'new-zealand',
    rings: [
      [
        [168, -34], [172, -36], [174, -40], [172, -44], [168, -42], [166, -38], [168, -34],
      ],
    ],
  },
  {
    id: 'madagascar',
    rings: [
      [
        [47, -15], [49, -18], [50, -22], [48, -25], [45, -23], [45, -18], [47, -15],
      ],
    ],
  },
  {
    id: 'antarctica',
    rings: [
      [
        [-180, -60], [-150, -61], [-120, -63], [-90, -64], [-60, -65],
        [-30, -66], [0, -67], [30, -67], [60, -66], [90, -65],
        [120, -64], [150, -63], [180, -62], [-180, -60],
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
