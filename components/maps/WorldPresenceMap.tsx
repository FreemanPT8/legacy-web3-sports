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
        [-168, 72], [-162, 71], [-154, 70], [-146, 69], [-136, 68],
        [-126, 66], [-120, 62], [-117, 58], [-114, 52], [-110, 48],
        [-105, 44], [-100, 40], [-96, 36], [-92, 32], [-88, 28],
        [-84, 25], [-82, 24], [-79, 26], [-77, 30], [-76, 34],
        [-74, 38], [-72, 43], [-70, 48], [-69, 52], [-71, 57],
        [-75, 61], [-82, 65], [-90, 68], [-102, 70], [-116, 72],
        [-134, 74], [-148, 75], [-160, 74], [-168, 72],
      ],
    ],
  },
  {
    id: 'central-america',
    rings: [
      [
        [-105, 24], [-100, 22], [-96, 20], [-92, 18], [-88, 16],
        [-84, 14], [-83, 10], [-85, 8], [-89, 9], [-93, 12],
        [-97, 15], [-100, 18], [-103, 20], [-106, 22], [-105, 24],
      ],
    ],
  },
  {
    id: 'greenland',
    rings: [
      [
        [-74, 83], [-64, 82], [-56, 79], [-50, 76], [-49, 73],
        [-52, 69], [-58, 69], [-64, 72], [-70, 75], [-74, 79], [-74, 83],
      ],
    ],
  },
  {
    id: 'south-america',
    rings: [
      [
        [-81, 12], [-78, 8], [-76, 4], [-74, -2], [-72, -8],
        [-70, -14], [-68, -22], [-66, -28], [-66, -34], [-68, -40],
        [-71, -46], [-74, -50], [-78, -53], [-80, -48], [-80, -40],
        [-80, -32], [-80, -24], [-81, -16], [-82, -8], [-82, -2],
        [-82, 6], [-81, 12],
      ],
    ],
  },
  {
    id: 'africa',
    rings: [
      [
        [-18, 34], [-10, 33], [-2, 32], [6, 31], [14, 28],
        [20, 24], [26, 18], [28, 10], [27, 2], [24, -6],
        [20, -14], [16, -22], [12, -30], [7, -35], [2, -36],
        [-4, -32], [-6, -24], [-8, -16], [-10, -6], [-12, 4],
        [-15, 16], [-18, 26], [-18, 34],
      ],
    ],
  },
  {
    id: 'eurasia',
    rings: [
      [
        [-10, 36], [-6, 40], [-2, 45], [4, 49], [12, 53], [20, 56],
        [30, 60], [42, 63], [54, 65], [66, 67], [80, 69],
        [96, 70], [110, 68], [124, 64], [136, 60], [146, 54],
        [152, 48], [154, 40], [150, 32], [142, 26], [130, 22],
        [118, 20], [106, 20], [94, 22], [82, 26], [72, 30],
        [62, 32], [52, 34], [42, 35], [32, 36], [24, 36],
        [16, 34], [8, 32], [2, 32], [-6, 34], [-10, 36],
      ],
    ],
  },
  {
    id: 'india',
    rings: [
      [
        [68, 28], [74, 27], [80, 25], [84, 22], [86, 18],
        [84, 14], [80, 12], [76, 15], [72, 18], [68, 22], [68, 28],
      ],
    ],
  },
  {
    id: 'se-asia',
    rings: [
      [
        [94, 14], [100, 16], [108, 15], [114, 12],
        [116, 8], [114, 4], [108, 2], [102, 4], [96, 8], [94, 14],
      ],
    ],
  },
  {
    id: 'east-asia',
    rings: [
      [
        [120, 42], [126, 44], [132, 42], [136, 38], [138, 34],
        [136, 30], [130, 28], [124, 30], [120, 34], [120, 42],
      ],
    ],
  },
  {
    id: 'japan',
    rings: [
      [
        [138, 34], [140, 37], [142, 41], [146, 43], [148, 38],
        [146, 33], [142, 31], [138, 34],
      ],
    ],
  },
  {
    id: 'indonesia-west',
    rings: [
      [
        [104, 4], [110, 6], [116, 6], [118, 2], [116, -2],
        [110, -2], [106, 0], [104, 4],
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
        [120, 18], [122, 20], [125, 19], [126, 16], [124, 14],
        [121, 14], [120, 18],
      ],
    ],
  },
  {
    id: 'australia',
    rings: [
      [
        [112, -12], [118, -16], [124, -18], [132, -22], [138, -26],
        [140, -32], [136, -38], [128, -40], [120, -36], [114, -30], [110, -22], [112, -12],
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
