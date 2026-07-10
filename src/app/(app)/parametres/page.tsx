import Link from "next/link";
import { Settings2, Mail } from "lucide-react";
import { ParametresForm } from "@/components/parametres/parametres-form";
import { updateParametres } from "@/lib/actions/parametres";
import { prisma } from "@/lib/prisma";

export default async function ParametresPage() {
  const parametres = await prisma.parametres.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Paramètres du CRM</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configurez les informations de votre entreprise, vos coordonnées bancaires et les valeurs par défaut de vos
            documents.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/parametres/email"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Mail className="h-4 w-4 text-brand-blue" />
            Messagerie
          </Link>
          <Link
            href="/parametres/codifications"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4 text-brand-blue" />
            Codifications
          </Link>
        </div>
      </div>

      <ParametresForm parametres={parametres} action={updateParametres} />
    </div>
  );
}
