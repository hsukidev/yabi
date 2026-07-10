import { useState } from 'react';
import type { HTMLAttributes, ReactNode, SyntheticEvent } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricTooltipProps extends HTMLAttributes<HTMLButtonElement> {
  ariaLabel: string;
  tooltip: ReactNode;
  children: ReactNode;
}

const DEFAULT_TRIGGER_CLASS =
  'inline-flex items-center bg-transparent p-0 border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const stopBubble = (e: SyntheticEvent) => e.stopPropagation();

export function MetricTooltip({
  ariaLabel,
  tooltip,
  children,
  className = DEFAULT_TRIGGER_CLASS,
  style,
  ...rest
}: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        {...rest}
        aria-label={ariaLabel}
        closeOnClick={false}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onPointerDown={stopBubble}
        onTouchStart={stopBubble}
        className={className}
        style={style}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="normal-case tracking-normal text-[11px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
