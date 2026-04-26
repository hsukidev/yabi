import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/context/ThemeProvider';

function ToastCheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      offset={20}
      gap={10}
      duration={5000}
      visibleToasts={3}
      expand
      icons={{ success: <ToastCheckIcon /> }}
      toastOptions={{
        classNames: {
          toast: 'mule-toast',
          title: 'text-[13px] font-medium tracking-tight leading-5',
          description: 'text-[12px] text-muted-foreground leading-4',
        },
      }}
      style={
        {
          '--width': '380px',
          '--normal-bg': 'var(--surface)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'transparent',
          '--border-radius': 'var(--radius)',
          '--toast-icon-margin-start': '0px',
          '--toast-icon-margin-end': '0px',
          '--toast-svg-margin-start': '0px',
          '--toast-svg-margin-end': '0px',
          '--toast-button-margin-start': '0px',
          '--toast-button-margin-end': '0px',
        } as React.CSSProperties
      }
    />
  );
}
