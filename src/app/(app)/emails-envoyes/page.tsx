import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { formatDate } from "@/lib/format";
import { Mail, User, FileText } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  "devis":             "Devis",
  "facture":           "Facture",
  "bon-commande":      "Bon de commande",
  "bc-beton":          "BC Béton",
  "contrat-st":        "Contrat ST",
  "ordre-mission":     "Ordre de mission",
  "etat-reserves":     "État des réserves",
  "memoire-technique": "Mémoire technique",
  "ppsps":             "PPSPS",
  "doe":               "DOE",
  "fiche-technique":   "Fiche technique",
  "brp":               "Réservation pompe",
  "bcf":               "BC Fournitures",
  "agrement-produit":  "Agrément produit",
  "pre-dim":           "Pré-dimensionnement",
  "planning-gantt":    "Planning Gantt",
  "pv-reception":      "PV de réception",
};

function typeColor(type: string) {
  const map: Record<string, string> = {
    "devis":    "bg-blue-50 text-blue-700",
    "facture":  "bg-emerald-50 text-emerald-700",
    "bon-commande": "bg-amber-50 text-amber-700",
    "contrat-st":   "bg-purple-50 text-purple-700",
  };
  return map[type] ?? "bg-slate-100 text-slate-600";
}

export default async function EmailsEnvoyesPage({
  searchParams,
}: {
  searchParams: Promise<{ sentBy?: string; type?: string; page?: string }>;
}) {
  const user = await getUser();
  if (user.role !== "DIRIGEANT") redirect("/acces-refuse");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 50;

  const where: Prisma.EmailLogWhereInput = {};
  if (sp.sentBy) where.sentBy = { equals: sp.sentBy, mode: "insensitive" };
  if (sp.type)   where.documentType = sp.type;

  const [logs, total, expéditeurs, types] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emailLog.count({ where }),
    prisma.emailLog.groupBy({ by: ["sentBy"], orderBy: { sentBy: "asc" } }),
    prisma.emailLog.groupBy({ by: ["documentType"], orderBy: { documentType: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Stats périodiques
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const yearStart = new Date(today.getFullYear(), 0, 1);

  const [todayCount, weekCount, monthCount, yearCount] = await Promise.all([
    prisma.emailLog.count({ where: { sentAt: { gte: today } } }),
    prisma.emailLog.count({ where: { sentAt: { gte: weekStart } } }),
    prisma.emailLog.count({ where: { sentAt: { gte: monthStart } } }),
    prisma.emailLog.count({ where: { sentAt: { gte: yearStart } } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-3">
        <Mail className="h-7 w-7 text-brand-blue" />
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Emails envoyés</h1>
          <p className="text-sm text-slate-500">Historique des envois depuis le CRM</p>
        </div>
      </div>

      {/* Cartes stats */}
      <div className="mb-6 grid grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Aujourd'hui</p>
          <p className="mt-1 text-3xl font-bold text-brand-navy">{todayCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Cette semaine</p>
          <p className="mt-1 text-3xl font-bold text-brand-navy">{weekCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Ce mois</p>
          <p className="mt-1 text-3xl font-bold text-brand-navy">{monthCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Cette année</p>
          <p className="mt-1 text-3xl font-bold text-brand-navy">{yearCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Total</p>
          <p className="mt-1 text-3xl font-bold text-brand-navy">{total}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filtres */}
        <aside className="w-52 shrink-0">
          <div className="sticky top-4 space-y-5">
            {/* Filtre expéditeur */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <User className="h-3.5 w-3.5" /> Expéditeur
              </p>
              <ul className="space-y-0.5">
                <li>
                  <a
                    href="/emails-envoyes"
                    className={`block rounded-lg px-3 py-1.5 text-sm ${!sp.sentBy && !sp.type ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    Tous
                  </a>
                </li>
                {expéditeurs.map((e) => (
                  <li key={e.sentBy}>
                    <a
                      href={`/emails-envoyes?sentBy=${encodeURIComponent(e.sentBy)}`}
                      className={`block rounded-lg px-3 py-1.5 text-sm truncate ${sp.sentBy === e.sentBy ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {e.sentBy || "—"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filtre type de document */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <FileText className="h-3.5 w-3.5" /> Type de document
              </p>
              <ul className="space-y-0.5">
                {types.map((t) => (
                  <li key={t.documentType}>
                    <a
                      href={`/emails-envoyes?type=${t.documentType}${sp.sentBy ? `&sentBy=${encodeURIComponent(sp.sentBy)}` : ""}`}
                      className={`block rounded-lg px-3 py-1.5 text-sm truncate ${sp.type === t.documentType ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {TYPE_LABELS[t.documentType] ?? t.documentType}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Tableau principal */}
        <div className="flex-1 min-w-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
              <Mail className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-400">Aucun email envoyé</p>
              <p className="text-sm text-slate-400">Les envois apparaîtront ici dès qu'un email sera transmis depuis le CRM.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Expéditeur</th>
                      <th className="px-4 py-3 text-left">Document</th>
                      <th className="px-4 py-3 text-left">Destinataire</th>
                      <th className="px-4 py-3 text-left">Adresse email</th>
                      <th className="px-4 py-3 text-left">Copie (Cc)</th>
                      <th className="px-4 py-3 text-left">Objet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const toName = log.to.replace(/<[^>]+>/, "").trim();
                      const toEmail = (log.to.match(/<([^>]+)>/) ?? [, log.to])[1];
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                            {formatDate(log.sentAt)}
                            <span className="ml-1 text-xs text-slate-400">
                              {log.sentAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700">{log.sentBy || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-semibold ${typeColor(log.documentType)}`}>
                                {TYPE_LABELS[log.documentType] ?? log.documentType}
                              </span>
                              <span className="text-xs text-slate-500">{log.documentRef}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700">{toName !== toEmail ? toName : "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <a href={`mailto:${toEmail}`} className="text-brand-blue hover:underline">
                              {toEmail}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {log.cc || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                            {log.subject}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>{total} envoi{total > 1 ? "s" : ""} au total</span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <a
                        href={`/emails-envoyes?page=${page - 1}${sp.sentBy ? `&sentBy=${encodeURIComponent(sp.sentBy)}` : ""}${sp.type ? `&type=${sp.type}` : ""}`}
                        className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                      >
                        ← Précédent
                      </a>
                    )}
                    <span className="rounded-lg border border-brand-blue bg-brand-blue/5 px-3 py-1 text-brand-blue font-medium">
                      {page} / {totalPages}
                    </span>
                    {page < totalPages && (
                      <a
                        href={`/emails-envoyes?page=${page + 1}${sp.sentBy ? `&sentBy=${encodeURIComponent(sp.sentBy)}` : ""}${sp.type ? `&type=${sp.type}` : ""}`}
                        className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
                      >
                        Suivant →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
