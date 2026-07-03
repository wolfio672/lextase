import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 font-[family-name:var(--font-display)] text-2xl italic tracking-tight"
      >
        L&rsquo;extase
      </Link>
      <div className="glass-card w-full max-w-md p-8 sm:p-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl italic" style={{ color: "var(--color-gold-bright)" }}>
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
      {footer ? <div className="mt-6 text-sm text-[var(--color-text-muted)]">{footer}</div> : null}
    </main>
  );
}
