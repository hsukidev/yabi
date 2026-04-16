import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch'
type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'

const gapMap: Record<Gap, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

const justifyMap: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
  stretch: 'justify-stretch',
}

const alignMap: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

interface GroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  gap?: Gap
  justify?: Justify
  align?: Align
  wrap?: boolean
}

function getWrapClass(wrap: boolean | undefined): string {
  if (wrap === true) return 'flex-wrap'
  if (wrap === false) return 'flex-nowrap'
  return ''
}

export function Group({ children, gap, justify, align, wrap, className, ...props }: GroupProps) {
  return (
    <div
      className={cn(
        'flex flex-row',
        gap && gapMap[gap],
        justify && justifyMap[justify],
        align && alignMap[align],
        getWrapClass(wrap),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
