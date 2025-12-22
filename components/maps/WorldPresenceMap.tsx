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
