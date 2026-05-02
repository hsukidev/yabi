import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { navItems, type NavItem } from '../constants/navItems';

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        className="md:hidden flex size-8 items-center justify-center rounded-md transition-colors cursor-pointer"
        style={{ color: 'var(--muted-raw, var(--muted-foreground))' }}
      >
        <Menu size={20} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          data-mobile-nav-drawer
          className="data-[side=left]:w-72 data-[side=left]:sm:max-w-xs bg-(--surface) p-0"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Site navigation links</SheetDescription>
          <nav className="flex flex-col gap-1 p-6 pt-14">
            {navItems.map((item) => (
              <DrawerNavLink key={item.to} item={item} onNavigate={() => setOpen(false)} />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DrawerNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      style={{
        display: 'block',
        color: 'var(--text, var(--foreground))',
        fontSize: 15,
        fontWeight: 500,
        padding: '10px 12px',
        borderRadius: 6,
        textDecoration: 'none',
      }}
    >
      {item.label}
    </Link>
  );
}
