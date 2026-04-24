import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/context/ThemeProvider';

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            'bg-popover text-popover-foreground border border-border rounded-[var(--radius)] shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
    />
  );
}
