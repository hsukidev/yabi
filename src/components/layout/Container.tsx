import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const sizeMap: Record<ContainerSize, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
}

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  size?: ContainerSize
}

export function Container({ children, size = 'lg', className, ...props }: ContainerProps) {
  return (
    <div className={cn('mx-auto px-4 py-4', sizeMap[size], className)} {...props}>
      {children}
    </div>
  )
}
