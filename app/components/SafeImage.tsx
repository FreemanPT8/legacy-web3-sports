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
  sizes?: string;
  style?: React.CSSProperties;
  fill?: boolean;
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
  sizes,
  style,
  fill = false,
}: Props) {
  const fallback = fallbackSrc || defaultFallback;
  const [currentSrc, setCurrentSrc] = React.useState(src || fallback);

  React.useEffect(() => {
    setCurrentSrc(src || fallback);
  }, [src, fallback]);

  return (
    <Image
      src={currentSrc || fallback}
      alt={alt || 'Image'}
      className={className}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      style={style}
      fill={fill}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setCurrentSrc(fallback)}
    />
  );
}
