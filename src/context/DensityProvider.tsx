import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Density = 'comfy' | 'compact';

interface DensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
}

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

function getInitialDensity(): Density {
  try {
    const stored = localStorage.getItem('density');
    if (stored === 'comfy' || stored === 'compact') return stored;
  } catch {
    // localStorage can throw in private-mode / sandboxed iframes — fall through.
  }
  return 'comfy';
}

function applyDensity(density: Density) {
  document.documentElement.setAttribute('data-density', density);
}

interface DensityProviderProps {
  children: ReactNode;
}

export function DensityProvider({ children }: DensityProviderProps) {
  const [density, setDensityState] = useState<Density>(getInitialDensity);

  useEffect(() => {
    applyDensity(density);
    localStorage.setItem('density', density);
  }, [density]);

  const setDensity = setDensityState;

  const toggleDensity = () => {
    setDensityState((prev) => (prev === 'comfy' ? 'compact' : 'comfy'));
  };

  return (
    <DensityContext.Provider value={{ density, setDensity, toggleDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
}
