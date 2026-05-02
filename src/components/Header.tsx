import { Sun, Moon } from 'lucide-react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { useTheme } from '../context/ThemeProvider';
import { WorldSelect } from './WorldSelect';
import { BuyMeCoffeeButton } from './BuyMeCoffeeButton';
import { MobileNavDrawer } from './MobileNavDrawer';
import { navItems, type NavItem } from '../constants/navItems';
import logoUrl from '../assets/logo.svg';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg, var(--background))',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="container mx-auto max-w-352 px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6 max-[767.99px]:gap-3">
            <MobileNavDrawer />
            <Link
              to="/"
              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
            >
              <img
                src={logoUrl}
                alt="YABI logo"
                width={28}
                height={28}
                style={{ width: 28, height: 28 }}
              />
              <span
                style={{
                  color: 'var(--text, var(--foreground))',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  fontSize: 15,
                }}
              >
                YABI
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              {navItems.map((item) => (
                <HeaderNavLink key={item.to} item={item} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-5 max-[479.99px]:gap-2">
            <WorldSelect />
            <button
              onClick={toggleTheme}
              className="flex size-8  items-center justify-center rounded-md transition-colors cursor-pointer"
              style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <BuyMeCoffeeButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderNavLink({ item }: { item: NavItem }) {
  const matchRoute = useMatchRoute();
  const isActive = Boolean(matchRoute({ to: item.to }));
  return (
    <Link
      to={item.to}
      data-active={isActive}
      style={{
        color: isActive
          ? 'var(--text, var(--foreground))'
          : 'var(--muted-raw, var(--muted-foreground))',
        fontSize: 14,
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'color 0.15s ease',
      }}
    >
      {item.label}
    </Link>
  );
}
