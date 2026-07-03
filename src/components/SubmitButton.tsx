"use client";

import { useFormStatus } from "react-dom";
import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"button"> & {
  pendingLabel?: string;
  variant?: "primary" | "danger" | "ghost";
};

export function SubmitButton({ children, pendingLabel, variant = "primary", className, ...rest }: Props) {
  const { pending } = useFormStatus();
  const variantClass = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-ghost";

  return (
    <button type="submit" disabled={pending} className={`${variantClass} ${className ?? ""}`} {...rest}>
      {pending ? (pendingLabel ?? "Patiente…") : children}
    </button>
  );
}
