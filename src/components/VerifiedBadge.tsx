export function VerifiedBadge({ size = 16, label = "Créatrice certifiée" }: { size?: number; label?: string }) {
  return (
    <span className="group relative inline-flex shrink-0 align-middle">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label={label}>
        <rect x="4" y="4" width="16" height="16" rx="3.5" fill="#2f7de1" />
        <rect x="4" y="4" width="16" height="16" rx="3.5" fill="#2f7de1" transform="rotate(45 12 12)" />
        <path d="M7.5 12.5l3 3 6.5-7.2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity duration-100 group-hover:opacity-100"
        style={{
          background: "var(--color-surface-raised)",
          borderColor: "var(--color-border-strong)",
          color: "var(--color-text)",
        }}
      >
        {label}
      </span>
    </span>
  );
}
