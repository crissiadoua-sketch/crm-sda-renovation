import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function AccesRefusePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <ShieldOff className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-brand-navy">Accès refusé</h2>
      <p className="mb-6 max-w-md text-slate-500">
        Vous n'avez pas les droits nécessaires pour accéder à cette section.
        Contactez votre dirigeant pour obtenir les accès requis.
      </p>
      <LinkButton href="/">Retour au tableau de bord</LinkButton>
    </div>
  );
}
