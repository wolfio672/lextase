"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-6 text-sm sm:flex">
      {items.map((item) => {
        const active = item.href === "/feed" ? pathname === "/feed" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
