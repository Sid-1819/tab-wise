import { useEffect, useState } from 'react';
import { DEFAULT_FAVICON, isMostlyLightIcon } from '@/lib/favicon';
import { cn } from '@/lib/utils';

interface FaviconImgProps {
  src?: string;
  className?: string;
}

export function FaviconImg({ src, className }: FaviconImgProps) {
  const [lightIcon, setLightIcon] = useState(false);

  useEffect(() => {
    setLightIcon(false);
  }, [src]);

  const inspect = (img: HTMLImageElement) => {
    try {
      const size = 16;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      setLightIcon(isMostlyLightIcon(ctx.getImageData(0, 0, size, size).data));
    } catch {
      setLightIcon(false);
    }
  };

  return (
    <img
      src={src || DEFAULT_FAVICON}
      alt=""
      className={cn(
        className,
        lightIcon && 'rounded-[3px] bg-neutral-800 ring-1 ring-neutral-800 dark:bg-transparent dark:ring-0'
      )}
      onLoad={(event) => inspect(event.currentTarget)}
      onError={(event) => {
        event.currentTarget.src = DEFAULT_FAVICON;
        setLightIcon(false);
      }}
    />
  );
}
