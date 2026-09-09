import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from '../context/ThemeProvider';
import { DensityProvider } from '../context/DensityProvider';
import { DisplayProvider } from '../context/DisplayProvider';
import { WorldProvider } from '../context/WorldProvider';
import { TrackerPreferenceProvider } from '../context/TrackerPreferenceProvider';
import { Header } from '../components/Header';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <DensityProvider>
          <DisplayProvider>
            <WorldProvider>
              <TrackerPreferenceProvider>
                <div className="min-h-screen bg-background text-foreground">
                  <Header />
                  <Outlet />
                </div>
              </TrackerPreferenceProvider>
            </WorldProvider>
          </DisplayProvider>
        </DensityProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
