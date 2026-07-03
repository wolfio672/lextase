"use client";

import { useState, useTransition } from "react";

type ActionState = { error?: string } | null;

export function PaymentActionButton({
  action,
  children,
  variant = "primary",
  size = "lg",
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  size?: "lg" | "sm";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  const sizeClass = size === "lg" ? "text-base px-8 py-4" : "text-xs px-4 py-2";

  return (
    <div className={`flex flex-col gap-2 ${size === "lg" ? "items-center" : "items-end"}`}>
      {error ? <p className="form-error">{error}</p> : null}
      <button
        type="button"
        className={`${base} ${sizeClass}`}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await action();
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "Redirection…" : children}
      </button>
    </div>
  );
}
