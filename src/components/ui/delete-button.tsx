"use client";

import { buttonClasses } from "@/components/ui/button";

export function DeleteButton({
  action,
  confirmMessage = "Confirmer la suppression ?",
  children = "Supprimer",
}: {
  action: () => void;
  confirmMessage?: string;
  children?: React.ReactNode;
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
      <button type="submit" className={buttonClasses("danger")}>
        {children}
      </button>
    </form>
  );
}
