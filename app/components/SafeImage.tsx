'use client';

import Image from 'next/image';
import * as React from 'react';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
  priority?: boolean;
};

const defaultFallback = '/favicon.ico';

export function SafeImage({
  src,
  alt = '',
  className,
  width = 800,
  height = 450,
  fallbackSrc,
  priority = false,
}: Props) {
  const [currentSrc, setCurrentSrc] = React.useState(src || fallbackSrc || defaultFallback);

  return (
    <Image
      src={currentSrc || fallbackSrc || defaultFallback}
      alt={alt || 'Image'}
      className={className}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setCurrentSrc(fallbackSrc || defaultFallback)}
    />
  );
}
