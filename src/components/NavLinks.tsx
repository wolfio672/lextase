"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/feed" ? pathname === "/feed" : pathname.startsWith(href));
  const linkClass = (href: string) =>
    isActive(href) ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]";

  return (
    <>
      <nav className="hidden items-center gap-6 text-sm sm:flex">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="btn-ghost p-2 sm:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          )}
        </svg>
      </button>

      {open ? (
        <nav
          className="glass-card absolute inset-x-4 top-full z-20 mt-2 flex flex-col gap-1 p-2 text-sm sm:hidden"
          onClick={() => setOpen(false)}
        >
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-2 ${linkClass(item.href)}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
