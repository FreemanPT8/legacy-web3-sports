import React, { useMemo } from 'react';
import worldData from '@/data/countries.json';
import { COUNTRY_MARKERS } from '@/data/country-markers';

type GeoFeature = {
  type: 'Feature';
  properties: {
    name: string;
    ['ISO3166-1-Alpha-2']?: string;
    ['ISO3166-1-Alpha-3']?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
};

type CountryStat = {
  code: string;
  memberCount: number;
};

const WIDTH = 1000;
const HEIGHT = 480;

const projectPoint = ([lon, lat]: [number, number]) => {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
  return [x, y] as const;
};

const buildRingPath = (ring: number[][]) => {
  if (!ring.length) return '';
  return (
    ring
      .map(([lon, lat], index) => {
        const [x, y] = projectPoint([lon, lat]);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ') + ' Z'
  );
};

const buildGeometryPath = (geometry: GeoFeature['geometry']): string => {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => buildRingPath(ring)).join(' ');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map((polygon) => polygon.map((ring) => buildRingPath(ring)).join(' '))
      .join(' ');
  }
  return '';
};

const RAW_FEATURES = (worldData as { features: GeoFeature[] }).features;

const MAP_FEATURES = RAW_FEATURES.map((feature) => ({
  iso: feature.properties['ISO3166-1-Alpha-2']?.toUpperCase(),
  name: feature.properties.name,
  path: buildGeometryPath(feature.geometry),
}));

type Props = {
  stats: CountryStat[];
};

export function WorldPresenceMap({ stats }: Props) {
  const statLookup = useMemo(() => {
    return stats.reduce<Record<string, number>>((acc, stat) => {
      acc[stat.code.toUpperCase()] = stat.memberCount;
      return acc;
    }, {});
  }, [stats]);

  const getFill = (iso?: string) => {
    const members = iso ? statLookup[iso] ?? 0 : 0;
    if (members >= 50) return '#fbbf24';
    if (members > 0) return '#05b2d6';
    return '#041a25';
  };

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
            <stop offset="0%" stopColor="#031422" />
            <stop offset="100%" stopColor="#01070e" />
          </linearGradient>
          <linearGradient id="grid-line" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#0d4058" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0c2432" stopOpacity="0.1" />
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

        {MAP_FEATURES.map((feature) => (
          <path
            key={feature.iso || feature.name}
            d={feature.path}
            fill={getFill(feature.iso)}
            stroke="#07283a"
            strokeWidth={0.5}
            opacity={feature.iso ? 0.95 : 0.4}
            style={{ transition: 'fill 0.3s ease' }}
          />
        ))}

        {COUNTRY_MARKERS.map((marker) => {
          const [x, y] = projectPoint([marker.lon, marker.lat]);
          const members = statLookup[marker.code.toUpperCase()] ?? 0;
          if (members <= 0) return null;
          const fill = members >= 50 ? '#fbbf24' : '#38d6f5';
          return (
            <g key={marker.code} transform={`translate(${x}, ${y})`}>
              <circle r={12} fill={fill} opacity={0.15} />
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
          <span className="inline-block h-3 w-3 rounded-full bg-[#05b2d6]" />
          <span>1-49 membros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#041a25]" />
          <span>Sem membros ainda</span>
        </div>
      </div>
    </div>
  );
}
