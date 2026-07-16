export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { SignaturePadPrc } from "./signature-pad-prc";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(d));
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

export default async function PrcPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const participant = await prisma.pVReunionChantierParticipant.findUnique({
    where: { shareToken: token },
    include: {
      pv: {
        include: {
          chantier: { select: { nom: true } },
          client: { select: { nom: true, prenom: true, raisonSociale: true } },
          points: { orderBy: { ordre: "asc" } },
          actions: { orderBy: { ordre: "asc" } },
          participants: { orderBy: { nom: "asc" } },
        },
      },
    },
  });

  if (!participant) notFound();

  if (participant.tokenExpiry && participant.tokenExpiry < new Date()) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl bg-white shadow-xl p-8 max-w-sm text-center">
          <p className="text-4xl mb-3">⏰</p>
          <h1 className="text-xl font-bold text-slate-700">Lien expiré</h1>
          <p className="text-sm text-slate-500 mt-2">
            Ce lien a expiré. Contactez SDA Rénovation pour obtenir un nouveau lien.
          </p>
          <p className="mt-3 text-sm text-[#1E2F6E]">{COMPANY.email}</p>
        </div>
      </div>
    );
  }

  const pv = participant.pv;
  const hasSigned = !!participant.dateSigne;
  const sdaSigned = !!pv.dateSigSDA;
  const bothSigned = hasSigned && sdaSigned;

  const dlUrl = `/api/pv-reunion-chantier/${pv.id}/dl?token=${token}`;

  const TYPE_LABELS: Record<string, string> = {
    COORDINATION: "Coordination", AVANCEMENT: "Avancement",
    SECURITE: "Sécurité", RECEPTION: "Réception", AUTRE: "Autre",
  };

  const STATUT_ACTION: Record<string, { label: string; cls: string }> = {
    OUVERTE: { label: "Ouverte", cls: "bg-amber-100 text-amber-700" },
    EN_COURS: { label: "En cours", cls: "bg-blue-100 text-blue-700" },
    CLOTUREE: { label: "Clôturée", cls: "bg-green-100 text-green-700" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Bandeau */}
      <div className="bg-[#1E2F6E] px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#29ABE2] to-[#1B3F94] flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="text-white font-bold text-sm">SDA Rénovation</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-xs font-mono">{pv.numero}</span>
          {bothSigned && (
            <a
              href={dlUrl}
              className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition"
            >
              📄 Télécharger PDF signé
            </a>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#1E2F6E]">Procès-Verbal de Réunion de Chantier</h1>
          <p className="text-[#F7941E] font-semibold uppercase tracking-wide mt-1">{pv.numero}</p>
          {pv.dateReunion && (
            <p className="text-slate-500 text-sm mt-1">Date de réunion : {fmt(pv.dateReunion)}</p>
          )}
          {pv.chantier && (
            <p className="text-slate-500 text-sm mt-0.5">Chantier : {pv.chantier.nom}</p>
          )}
          <p className="mt-1 text-xs font-medium bg-[#1E2F6E]/10 text-[#1E2F6E] rounded-full px-3 py-1 inline-block">
            {TYPE_LABELS[pv.typeReunion] ?? pv.typeReunion}
          </p>
        </div>

        {/* Informations réunion */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
          <Card title="Organisé par">
            <p className="font-bold text-[#1E2F6E]">{COMPANY.nom}</p>
            {pv.animateur && <p className="text-sm text-slate-600 mt-1">Animateur : {pv.animateur}</p>}
            {pv.redacteur && <p className="text-sm text-slate-600">Rédacteur : {pv.redacteur}</p>}
            {sdaSigned && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                ✅ Signé le {fmt(pv.dateSigSDA)}
              </p>
            )}
          </Card>
          <Card title="Vous participez en tant que">
            <p className="font-bold text-[#1E2F6E]">{participant.nom}</p>
            {participant.societe && <p className="text-sm text-slate-600 mt-1">{participant.societe}</p>}
            {participant.fonction && <p className="text-sm text-slate-500">{participant.fonction}</p>}
            {hasSigned && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                ✅ Signé le {fmt(participant.dateSigne)}
              </p>
            )}
          </Card>
        </div>

        {/* Lieu / Horaires */}
        {(pv.lieuReunion || pv.heureDebut) && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lieu & Horaires</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {pv.lieuReunion && <div><span className="text-slate-400 text-xs">Lieu : </span>{pv.lieuReunion}</div>}
              {pv.heureDebut && <div><span className="text-slate-400 text-xs">Début : </span>{pv.heureDebut}</div>}
              {pv.heureFin && <div><span className="text-slate-400 text-xs">Fin : </span>{pv.heureFin}</div>}
            </div>
          </div>
        )}

        {/* Participants */}
        {pv.participants.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Participants ({pv.participants.filter(p => p.present).length} présents)</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-[#1E2F6E] text-white text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Nom</th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell">Société</th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell">Fonction</th>
                    <th className="px-3 py-2.5 text-center">Présence</th>
                    <th className="px-3 py-2.5 text-center">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pv.participants.map((p) => (
                    <tr key={p.id} className={p.id === participant.id ? "bg-blue-50" : ""}>
                      <td className="px-3 py-2 font-medium">
                        {p.nom}
                        {p.id === participant.id && <span className="ml-2 text-[10px] bg-[#1E2F6E] text-white rounded px-1">Vous</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{p.societe ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{p.fonction ?? "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.present ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                          {p.present ? "Présent" : "Absent"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.dateSigne
                          ? <span className="text-emerald-600 text-xs font-semibold">✅ Signé</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Points à l'ordre du jour */}
        {pv.points.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Ordre du jour</h2>
            <div className="flex flex-col gap-3">
              {pv.points.map((pt) => (
                <div key={pt.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-bold text-slate-500 mb-1">Point {pt.ordre}</p>
                  <p className="font-semibold text-slate-800">{pt.titre}</p>
                  {pt.contenu && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{pt.contenu}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {pv.actions.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Plan d&apos;actions</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-[#1E2F6E] text-white text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left">#</th>
                    <th className="px-3 py-2.5 text-left">Action</th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell">Responsable</th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell">Échéance</th>
                    <th className="px-3 py-2.5 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pv.actions.map((a) => {
                    const s = STATUT_ACTION[a.statut] ?? { label: a.statut, cls: "bg-slate-100 text-slate-500" };
                    return (
                      <tr key={a.id}>
                        <td className="px-3 py-2 text-slate-400 text-xs">{a.ordre}</td>
                        <td className="px-3 py-2 font-medium">{a.description}</td>
                        <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{a.responsable ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{a.echeance ? fmt(a.echeance) : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {pv.notes && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes complémentaires</p>
            <p className="text-sm text-slate-700 whitespace-pre-line">{pv.notes}</p>
          </div>
        )}

        {/* Prochaine réunion */}
        {(pv.prochaineDateReunion || pv.prochaineLieu) && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Prochaine réunion</p>
            {pv.prochaineDateReunion && <p className="text-sm text-blue-700">Le {fmt(pv.prochaineDateReunion)}</p>}
            {pv.prochaineLieu && <p className="text-sm text-blue-600">{pv.prochaineLieu}</p>}
          </div>
        )}

        {/* ── Section Signature ── */}
        <div className="mt-4 mb-6">
          {/* Les deux ont signé */}
          {bothSigned && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-6 text-center flex flex-col items-center gap-3">
              <p className="text-3xl">✅</p>
              <p className="text-emerald-700 font-bold text-lg">PV signé par les deux parties</p>
              <p className="text-emerald-600 text-sm">
                Le PV de réunion est maintenant définitivement signé et peut être téléchargé.
              </p>
              <a
                href={dlUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1E2F6E] text-white px-6 py-3 text-sm font-bold hover:bg-[#1B3F94] transition shadow-md mt-2"
              >
                📄 Télécharger le PV signé (PDF)
              </a>
            </div>
          )}

          {/* Participant a signé, en attente SDA */}
          {hasSigned && !sdaSigned && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-6 text-center flex flex-col items-center gap-3">
              <p className="text-3xl">⏳</p>
              <p className="text-blue-700 font-bold text-lg">Votre signature a été enregistrée</p>
              <p className="text-blue-600 text-sm max-w-md">
                SDA Rénovation doit maintenant apposer sa propre signature.
                <strong> Vous recevrez un email</strong> dès que le PV sera disponible au téléchargement.
              </p>
              {participant.signatureImage && (
                <div className="mt-1">
                  <p className="text-xs text-blue-500 mb-1">Votre signature :</p>
                  <img src={participant.signatureImage} alt="Votre signature" className="h-12 object-contain" />
                </div>
              )}
              <p className="text-xs text-blue-400">
                Signé le {fmt(participant.dateSigne)}
              </p>
            </div>
          )}

          {/* Pas encore signé → pad */}
          {!hasSigned && (
            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-[#1E2F6E] text-lg">Votre signature est requise</h2>
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-sm text-blue-800">
                  Après lecture du compte-rendu ci-dessus, veuillez apposer votre signature électronique.
                  SDA Rénovation signera à son tour, puis vous pourrez télécharger le PV définitivement signé.
                </p>
              </div>
              <SignaturePadPrc
                token={token}
                pvNumero={pv.numero}
                participantNom={participant.nom}
              />
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>{COMPANY.nom} · {COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
          <p className="mt-1">{COMPANY.email} · {COMPANY.telephone}</p>
        </div>
      </div>
    </div>
  );
}
