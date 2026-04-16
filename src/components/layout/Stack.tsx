import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const gapMap: Record<Gap, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  gap?: Gap
}

export function Stack({ children, gap, className, ...props }: StackProps) {
  return (
    <div className={cn('flex flex-col', gap && gapMap[gap], className)} {...props}>
      {children}
    </div>
  )
}
