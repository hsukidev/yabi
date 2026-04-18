import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeProvider'
import { Button } from '@/components/ui/button'
import leafImg from '@/assets/logo.png'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className="container mx-auto max-w-7xl flex items-center justify-between gap-6 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src={leafImg} alt="" aria-hidden className="h-6 w-8" />
          <div className="min-w-0">
            <h1 className="font-display text-[1.55rem] leading-none font-black tracking-tight">
              Mule<span className="text-[var(--accent-primary)]">.</span>Income
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-5">
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