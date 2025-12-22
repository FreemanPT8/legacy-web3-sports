import React, { useMemo } from 'react';
import worldData from '@/data/countries.json';

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

const buildGeometryPath = (
  geometry: GeoFeature['geometry'],
): string => {
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
    if (!iso) return '#031621';
    const members = statLookup[iso] ?? 0;
    if (members >= 50) return '#fbbf24';
    if (members > 0) return '#06b6d4';
    return '#031621';
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#010f17] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="World presence map"
      >
        <rect width={WIDTH} height={HEIGHT} fill="#000c12" />
        {MAP_FEATURES.map((feature) => (
          <path
            key={feature.iso || feature.name}
            d={feature.path}
            fill={getFill(feature.iso)}
            stroke="#041420"
            strokeWidth={0.4}
            style={{ transition: 'fill 0.3s ease' }}
          />
        ))}
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
          <span className="inline-block h-3 w-3 rounded-full bg-[#031621]" />
          <span>Sem membros ainda</span>
        </div>
      </div>
    </div>
  );
}
