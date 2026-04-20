import { type ReactElement } from 'react'
import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeProvider'
import { IncomeProvider } from '@/modules/income'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  defaultTheme?: 'dark' | 'light'
  defaultAbbreviated?: boolean
}

export function render(
  ui: ReactElement,
  { defaultTheme = 'dark', defaultAbbreviated = true, ...options }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider defaultTheme={defaultTheme}>
        <IncomeProvider defaultAbbreviated={defaultAbbreviated}>
          {children}
        </IncomeProvider>
      </ThemeProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}

export { screen, fireEvent, waitFor, within } from '@testing-library/react'
