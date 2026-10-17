import type { ImgHTMLAttributes } from 'react'

export interface LogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  className?: string
  alt?: string
}

export default function Logo({
  className = 'h-8 w-auto object-contain',
  alt = 'AIVES Logo',
  style,
  ...props
}: LogoProps) {
  return (
    <img
      src="/aives-logo.svg"
      alt={alt}
      className={className}
      style={{ objectFit: 'contain', ...style }}
      {...props}
    />
  )
}
