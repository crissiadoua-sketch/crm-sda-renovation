import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { importReleve } from "@/lib/actions/rapprochement";
import { ImportReleveForm } from "./import-releve-form";

export default async function RapprochementBancairePage() {
  const releves = await prisma.releveBancaire.findMany({
    include: { _count: { select: { lignes: true } }, lignes: { select: { statut: true } } },
    orderBy: { dateImport: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Rapprochement bancaire</h2>
        <p className="mt-1 text-sm text-slate-500">
          Importez un relevé bancaire (CSV ou OFX) et faites correspondre chaque ligne à un paiement
          client ou une dépense déjà enregistrée dans le CRM.
        </p>
      </div>

      <ImportReleveForm action={importReleve} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Relevé</th>
              <th className="px-4 py-3">Banque</th>
              <th className="px-4 py-3">Importé le</th>
              <th className="px-4 py-3 text-center">Lignes</th>
              <th className="px-4 py-3 text-center">Rapprochées</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {releves.map((r) => {
              const rapprochees = r.lignes.filter((l) => l.statut === "RAPPROCHE").length;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/comptabilite/rapprochement/${r.id}`} className="font-medium text-brand-navy hover:underline">
                      {r.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.banque ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.dateImport)}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{r._count.lignes}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={rapprochees === r._count.lignes ? "font-semibold text-green-600" : "text-slate-600"}>
                      {rapprochees} / {r._count.lignes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/comptabilite/rapprochement/${r.id}`} className="text-sm text-brand-blue hover:underline">
                      Rapprocher →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {releves.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucun relevé importé pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
