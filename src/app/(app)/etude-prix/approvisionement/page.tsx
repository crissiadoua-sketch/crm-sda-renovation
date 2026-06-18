import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inputClasses, selectClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { creerApprovisionement } from "@/lib/actions/approvisionement";
import { formatDate } from "@/lib/format";

export default async function ApprovisionementPage() {
  const docs = await prisma.approvisionementChantier.findMany({
    include: {
      chantier: { select: { id: true, nom: true, reference: true } },
      devis: { select: { id: true, numero: true } },
      lignes: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const chantiers = await prisma.chantier.findMany({
    select: { id: true, nom: true, reference: true },
    orderBy: { nom: "asc" },
  });

  const devisList = await prisma.devis.findMany({
    select: { id: true, numero: true, objet: true },
    orderBy: { dateCreation: "desc" },
  });

  const total = docs.length;
  const avecDevisOuChantier = docs.filter((d) => d.devisId || d.chantierId).length;
  const totalLignes = docs.reduce((acc, d) => acc + d.lignes.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Approvisionnement de chantier</h1>
        <p className="mt-1 text-sm text-slate-500">Documents AC — étude de prix</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total AC", value: total },
          { label: "Liés à un devis / affaire", value: avecDevisOuChantier },
          { label: "Lignes au total", value: totalLignes },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-navy">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      <form
        action={creerApprovisionement}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 font-semibold text-brand-navy">Nouveau document AC</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
            <input type="text" name="titre" placeholder="Ex : Béton et coffrages Bât A" className={inputClasses} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
            <select name="chantierId" className={selectClasses}>
              <option value="">— Aucun —</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Devis</label>
            <select name="devisId" className={selectClasses}>
              <option value="">— Aucun —</option>
              {devisList.map((d) => (
                <option key={d.id} value={d.id}>{d.numero}{d.objet ? ` — ${d.objet}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Responsable</label>
            <input type="text" name="responsable" className={inputClasses} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <SubmitButton pendingLabel="Création…">Créer le document</SubmitButton>
        </div>
      </form>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Devis</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Lignes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Aucun document d'approvisionnement
                </td>
              </tr>
            )}
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-brand-navy">
                  {d.numero}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{d.titre ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{d.chantier?.nom ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{d.devis?.numero ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{d.responsable ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(d.date)}</td>
                <td className="px-4 py-3 text-slate-600">{d.lignes.length}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/etude-prix/approvisionement/${d.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/5"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
