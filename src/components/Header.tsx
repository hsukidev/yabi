import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeProvider'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  totalWeeklyIncome: string
  muleCount: number
}

function CrystalMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 text-[var(--accent-secondary)] drop-shadow-[0_0_8px_var(--accent-secondary)]"
      fill="currentColor"
    >
      <path d="M12 2L21.5 8.5V15.5L12 22L2.5 15.5V8.5L12 2Z" />
      <path d="M12 2L21.5 8.5L12 15.5L2.5 8.5L12 2Z" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export function Header({ totalWeeklyIncome }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto max-w-7xl flex items-center justify-between gap-6 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <CrystalMark />
          <div className="min-w-0">
            <h1 className="font-display text-[1.55rem] leading-none font-black tracking-tight">
              Mule<span className="text-[var(--accent-primary)]">.</span>Income
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex flex-col items-end">
            <span className="font-sans text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              This Week
            </span>
            <span className="font-mono-nums text-sm text-[var(--accent-numeric)] mt-0.5">
              {totalWeeklyIncome}
              <span className="text-muted-foreground/70 ml-1 font-sans normal-case tracking-normal">mesos</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle color scheme"
            className="rounded-full border border-border/60 hover:border-[var(--accent-primary)]/70 hover:bg-[var(--accent-primary)]/5 hover:text-[var(--accent-primary)] transition-[color,background-color,border-color,box-shadow] hover:shadow-[0_0_20px_-6px_var(--accent-primary)]"
          >
            {isDark ? <Sun size={18} aria-label="Sun" /> : <Moon size={18} aria-label="Moon" />}
          </Button>
        </div>
      </div>
    </header>
  )
}