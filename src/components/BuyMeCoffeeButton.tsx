import { Coffee } from 'lucide-react';

const DONATION_URL = 'https://buymeacoffee.com/hsukidev';

export function BuyMeCoffeeButton() {
  return (
    <a
      href={DONATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="coffee-btn inline-flex h-8 items-center justify-center gap-2 rounded-md border px-2 sm:px-3 text-[13px] font-medium tracking-tight cursor-pointer"
      aria-label="Buy me a coffee — opens donation page in new tab"
    >
      <Coffee size={14} className="coffee-cup" />
      <span className="hidden sm:inline">Buy me a coffee</span>
    </a>
  );
}
