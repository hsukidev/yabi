import { type ReactElement } from 'react'
import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeProvider'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  defaultTheme?: 'dark' | 'light'
}

export function render(
  ui: ReactElement,
  { defaultTheme = 'dark', ...options }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}

export { screen, fireEvent, waitFor } from '@testing-library/react'
