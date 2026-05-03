import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { navItems, type NavItem } from '../constants/navItems';
import logoUrl from '../assets/logo.svg';

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        className="md:hidden flex size-9 items-center justify-center rounded-md border border-(--border) bg-transparent text-(--muted-raw) transition-[background-color,color,border-color] duration-150 cursor-pointer hover:bg-(--accent-soft) hover:text-(--accent-raw) hover:border-(--accent-raw)"
      >
        <Menu size={18} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          data-mobile-nav-drawer
          className="data-[side=left]:w-[84vw] data-[side=left]:max-w-[300px] data-[side=left]:sm:max-w-[300px] bg-(--bg) p-0 gap-0"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Site navigation links</SheetDescription>

          <header
            className="flex items-center gap-2.5 px-4 py-3.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              width={26}
              height={26}
              style={{ width: 26, height: 26, display: 'block' }}
            />
            <span
              style={{
                color: 'var(--text)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                fontSize: 14,
              }}
            >
              YABI
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="grid place-items-center size-[30px] rounded-md border border-(--border) bg-transparent text-(--muted-raw) cursor-pointer transition-[background-color,color,border-color] duration-150 hover:bg-(--accent-soft) hover:text-(--accent-raw) hover:border-(--accent-raw)"
            >
              <X size={14} strokeWidth={1.6} />
            </button>
          </header>

          <nav className="flex-1 overflow-y-auto px-2 py-2.5">
            <ul className="m-0 list-none p-0 flex flex-col gap-px">
              {navItems.map((item) => (
                <DrawerNavLink key={item.to} item={item} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DrawerNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <li>
      <Link
        to={item.to}
        onClick={onNavigate}
        activeOptions={{ exact: item.to === '/' }}
        className="block w-full rounded-md text-(--text) hover:bg-(--surface) data-[status=active]:bg-(--accent-soft) data-[status=active]:text-(--accent-raw) data-[status=active]:font-semibold transition-[background-color,color] duration-150"
        style={{
          padding: '9px 12px',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          textDecoration: 'none',
        }}
      >
        {item.label}
      </Link>
    </li>
  );
}
