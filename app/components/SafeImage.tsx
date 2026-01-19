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

const shouldProxy = (value?: string | null) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.startsWith('/storage/v1/object/public/')
    );
  } catch {
    return false;
  }
};

const resolveSrc = (value?: string | null) => {
  if (!value) return value;
  if (!shouldProxy(value)) return value;
  return `/api/media/proxy?url=${encodeURIComponent(value)}`;
};

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
  const resolvedSrc = resolveSrc(src);
  const [currentSrc, setCurrentSrc] = React.useState(resolvedSrc || fallback);

  React.useEffect(() => {
    setCurrentSrc(resolvedSrc || fallback);
  }, [resolvedSrc, fallback]);

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
