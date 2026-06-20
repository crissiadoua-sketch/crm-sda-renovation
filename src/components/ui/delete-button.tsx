"use client";

import { buttonClasses } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmMessage = "Confirmer la suppression ?",
  children = "Supprimer",
  className,
}: {
  action: () => void;
  confirmMessage?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className ?? buttonClasses("danger")}>
        {children}
      </button>
    </form>
  );
}
