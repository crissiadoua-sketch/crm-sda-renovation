"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, className)}>
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}
