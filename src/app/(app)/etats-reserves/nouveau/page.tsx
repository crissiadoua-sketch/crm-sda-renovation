export const dynamic = "force-dynamic";

import Link from "next/link";
import { EtatReservesForm } from "@/components/etats-reserves/etat-form";
import { createEtatReserves } from "@/lib/actions/etats-reserves";
import { prisma } from "@/lib/prisma";

export default async function NouvelEtatReservesPage() {
  const [chantiers, clients] = await Promise.all([
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/etats-reserves" className="text-sm text-brand-blue hover:underline">
          ← Retour aux états des réserves
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvel état des réserves</h2>
        <p className="mt-1 text-sm text-slate-500">
          Document de réception des travaux avec liste des réserves et constat de levée.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EtatReservesForm chantiers={chantiers} clients={clients} action={createEtatReserves} />
      </div>
    </div>
  );
}
