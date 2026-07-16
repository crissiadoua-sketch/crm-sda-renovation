"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { sauvegarderBonReservationPompe, supprimerBonReservationPompe } from "@/lib/actions/bons-reservation-pompe";

const STATUTS = ["BROUILLON", "ENVOYE", "CONFIRME", "ANNULE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", CONFIRME: "Confirmé", ANNULE: "Annulé",
};
const MODES_REGLEMENT = [
  "Comptant à la livraison",
  "Virement 30 jours fin de mois le 15",
  "Virement 30 jours fin de mois",
  "Virement 45 jours fin de mois",
  "Sur BL signé",
];
const TYPES_POMPE = [
  "Pompe à flèche",
  "Pompe stationnaire",
  "Mini-pompe",
  "Pompe à tuyauterie",
  "Pompe sur camion porteur",
  "Pompe sur remorque",
];

type BRPData = {
  id: string;
  numero: string;
  statut: string;
  fournisseurId: string;
  chantierId: string | null;
  clientId: string | null;
  nomChantier: string | null;
  adresseChantier: string | null;
  contactTelephone: string | null;
  refAnalytique: string | null;
  dateReservation: string | null;
  heureArriveePompe: string | null;
  heureDebutPompage: string | null;
  heureFinPompage: string | null;
  cubagePrévu: number | null;
  centraleBeton: string | null;
  typePompe: string | null;
  avecFleche: boolean;
  flecheMetres: number | null;
  sansFleche: boolean;
  tuyauterieMetres: number | null;
  tuyauterieSupp: boolean;
  tuyauterieSupplementaire: number | null;
  prixHT: number | null;
  tauxTVA: number | null;
  modeReglement: string | null;
  conditions: string | null;
  notes: string | null;
  fournisseur: { id: string; nom: string; telephone?: string | null; email?: string | null; adresse?: string | null; codePostal?: string | null; ville?: string | null };
  chantier: { id: string; nom: string; adresse?: string | null } | null;
  client: { id: string; nom: string; raisonSociale?: string | null; telephone?: string | null } | null;
};

export function BonReservationPompeEditor({
  brp,
  fournisseurs,
  chantiers,
  clients,
}: {
  brp: BRPData;
  fournisseurs: { id: string; nom: string }[];
  chantiers:    { id: string; nom: string; adresse?: string | null; clientId?: string | null; client?: { telephone?: string | null } | null }[];
  clients:      { id: string; nom: string; raisonSociale?: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    fournisseurId:     brp.fournisseurId,
    chantierId:        brp.chantierId ?? "",
    clientId:          brp.clientId ?? "",
    statut:            brp.statut,
    nomChantier:       brp.nomChantier ?? "",
    adresseChantier:   brp.adresseChantier ?? "",
    contactTelephone:  brp.contactTelephone ?? "",
    refAnalytique:     brp.refAnalytique ?? "",
    dateReservation:   brp.dateReservation ?? "",
    heureArriveePompe: brp.heureArriveePompe ?? "",
    heureDebutPompage: brp.heureDebutPompage ?? "",
    heureFinPompage:   brp.heureFinPompage ?? "",
    cubagePrévu:       brp.cubagePrévu?.toString() ?? "",
    centraleBeton:     brp.centraleBeton ?? "",
    typePompe:         brp.typePompe ?? "",
    avecFleche:        brp.avecFleche,
    flecheMetres:      brp.flecheMetres?.toString() ?? "",
    sansFleche:        brp.sansFleche,
    tuyauterieMetres:  brp.tuyauterieMetres?.toString() ?? "",
    tuyauterieSupp:    brp.tuyauterieSupp,
    tuyauterieSupplementaire: brp.tuyauterieSupplementaire?.toString() ?? "",
    prixHT:            brp.prixHT?.toString() ?? "",
    tauxTVA:           brp.tauxTVA?.toString() ?? "20",
    modeReglement:     brp.modeReglement ?? "",
    conditions:        brp.conditions ?? "",
    notes:             brp.notes ?? "",
  });

  const set = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── Pré-remplissage depuis chantier ──────────────────────────────────────────
  const handleChantierChange = (chantierId: string) => {
    const ch = chantiers.find(c => c.id === chantierId);
    if (!ch) { set("chantierId", chantierId); return; }
    setForm(prev => ({
      ...prev,
      chantierId,
      nomChantier:      prev.nomChantier      || ch.nom                    || "",
      adresseChantier:  prev.adresseChantier  || ch.adresse                || "",
      clientId:         prev.clientId         || ch.clientId               || "",
      contactTelephone: prev.contactTelephone || ch.client?.telephone      || "",
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      await sauvegarderBonReservationPompe(brp.id, {
        fournisseurId:           form.fournisseurId,
        chantierId:              form.chantierId || undefined,
        clientId:                form.clientId || undefined,
        statut:                  form.statut,
        nomChantier:             form.nomChantier || undefined,
        adresseChantier:         form.adresseChantier || undefined,
        contactTelephone:        form.contactTelephone || undefined,
        refAnalytique:           form.refAnalytique || undefined,
        dateReservation:         form.dateReservation || undefined,
        heureArriveePompe:       form.heureArriveePompe || undefined,
        heureDebutPompage:       form.heureDebutPompage || undefined,
        heureFinPompage:         form.heureFinPompage || undefined,
        cubagePrévu:             form.cubagePrévu ? parseFloat(form.cubagePrévu) : undefined,
        centraleBeton:           form.centraleBeton || undefined,
        typePompe:               form.typePompe || undefined,
        avecFleche:              form.avecFleche,
        flecheMetres:            form.flecheMetres ? parseFloat(form.flecheMetres) : undefined,
        sansFleche:              form.sansFleche,
        tuyauterieMetres:        form.tuyauterieMetres ? parseFloat(form.tuyauterieMetres) : undefined,
        tuyauterieSupp:          form.tuyauterieSupp,
        tuyauterieSupplementaire: form.tuyauterieSupplementaire ? parseFloat(form.tuyauterieSupplementaire) : undefined,
        prixHT:                  form.prixHT ? parseFloat(form.prixHT) : undefined,
        tauxTVA:                 form.tauxTVA ? parseFloat(form.tauxTVA) : 20,
        modeReglement:           form.modeReglement || undefined,
        conditions:              form.conditions || undefined,
        notes:                   form.notes || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await supprimerBonReservationPompe(brp.id);
    });
  };

  const prixHT  = parseFloat(form.prixHT || "0");
  const tauxTVA = parseFloat(form.tauxTVA || "20") / 100;
  const tva     = prixHT * tauxTVA;
  const ttc     = prixHT + tva;

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/bons-commande" className="hover:text-brand-blue">Bons de commande</Link>
        <span>/</span>
        <Link href="/bons-commande/pompe" className="hover:text-brand-blue">Réservation Pompe</Link>
        <span>/</span>
        <span className="font-mono text-brand-navy font-semibold">{brp.numero}</span>
      </div>

      {/* ── En-tête ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy">{brp.numero}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Réservation de pompe à béton — {brp.fournisseur.nom}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.statut} onChange={e => set("statut", e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
          <Link href={`/apercu/bon-reservation-pompe/${brp.id}`} target="_blank"
            className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 transition">
            Aperçu PDF
          </Link>
          <button onClick={handleSave} disabled={isPending}
            className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
            {isPending ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Colonne principale ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Section 1 — Identification */}
          <Section title="Identification" icon="📋">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Société de pompage *">
                <select value={form.fournisseurId} onChange={e => set("fournisseurId", e.target.value)}
                  className={input}>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </Field>
              <Field label="Client">
                <select value={form.clientId} onChange={e => set("clientId", e.target.value)}
                  className={input}>
                  <option value="">— aucun —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.raisonSociale ?? c.nom}</option>
                  ))}
                </select>
              </Field>
              <Field label="Chantier lié (CRM)">
                <select value={form.chantierId} onChange={e => handleChantierChange(e.target.value)}
                  className={input}>
                  <option value="">— aucun —</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </Field>
              <Field label="Nom du chantier (libre)">
                <input value={form.nomChantier} onChange={e => set("nomChantier", e.target.value)}
                  className={input} placeholder="Ex: Résidence Les Pins" />
              </Field>
              <Field label="Adresse du chantier">
                <input value={form.adresseChantier} onChange={e => set("adresseChantier", e.target.value)}
                  className={input} placeholder="12 rue du Moulin, 31000 Toulouse" />
              </Field>
              <Field label="Téléphone contact chantier">
                <input value={form.contactTelephone} onChange={e => set("contactTelephone", e.target.value)}
                  className={input} placeholder="06 xx xx xx xx" />
              </Field>
              <Field label="Centrale à béton">
                <input value={form.centraleBeton} onChange={e => set("centraleBeton", e.target.value)}
                  className={input} placeholder="Nom de la centrale fournissant le béton" />
              </Field>
              <Field label="Réf. analytique">
                <input value={form.refAnalytique} onChange={e => set("refAnalytique", e.target.value)}
                  className={input} placeholder="CH-2025-001" />
              </Field>
            </div>
          </Section>

          {/* Section 2 — Planning */}
          <Section title="Planning d'intervention" icon="🕐">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Field label="Date d'intervention">
                  <input type="date" value={form.dateReservation}
                    onChange={e => set("dateReservation", e.target.value)}
                    className={input} />
                </Field>
              </div>
              <Field label="Heure arrivée pompe">
                <input type="time" value={form.heureArriveePompe}
                  onChange={e => set("heureArriveePompe", e.target.value)}
                  className={input} />
              </Field>
              <Field label="Heure début pompage">
                <input type="time" value={form.heureDebutPompage}
                  onChange={e => set("heureDebutPompage", e.target.value)}
                  className={input} />
              </Field>
              <Field label="Heure fin pompage">
                <input type="time" value={form.heureFinPompage}
                  onChange={e => set("heureFinPompage", e.target.value)}
                  className={input} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Cubage prévu (m³)">
                <input type="number" step="0.5" min="0" value={form.cubagePrévu}
                  onChange={e => set("cubagePrévu", e.target.value)}
                  className={`${input} max-w-xs text-lg font-bold text-brand-navy`}
                  placeholder="Ex: 25" />
              </Field>
            </div>
          </Section>

          {/* Section 3 — Type de pompe */}
          <Section title="Type de pompe" icon="🏗️">
            <div className="mb-4">
              <Field label="Modèle / type de pompe">
                <select value={form.typePompe} onChange={e => set("typePompe", e.target.value)}
                  className={input}>
                  <option value="">— choisir ou saisir —</option>
                  {TYPES_POMPE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              {/* Avec flèche */}
              <div className={`rounded-lg border p-4 transition ${
                form.avecFleche ? "border-brand-blue/40 bg-blue-50" : "border-slate-200 bg-white"
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.avecFleche}
                    onChange={e => set("avecFleche", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-brand-navy" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Pompe à flèche</p>
                    <p className="text-xs text-slate-400">Flèche télescopique articulée pour accès difficile</p>
                    {form.avecFleche && (
                      <div className="mt-3">
                        <Field label="Longueur de flèche (mètres)">
                          <input type="number" step="1" min="0" value={form.flecheMetres}
                            onChange={e => set("flecheMetres", e.target.value)}
                            className={`${input} max-w-xs`} placeholder="Ex: 28" />
                        </Field>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Sans flèche / tuyauterie */}
              <div className={`rounded-lg border p-4 transition ${
                form.sansFleche ? "border-brand-blue/40 bg-blue-50" : "border-slate-200 bg-white"
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.sansFleche}
                    onChange={e => set("sansFleche", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-brand-navy" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Sans flèche (tuyauterie au sol)</p>
                    <p className="text-xs text-slate-400">Pompe avec tuyauterie rigide ou flexible posée au sol</p>
                    {form.sansFleche && (
                      <div className="mt-3">
                        <Field label="Longueur tuyauterie (mètres)">
                          <input type="number" step="1" min="0" value={form.tuyauterieMetres}
                            onChange={e => set("tuyauterieMetres", e.target.value)}
                            className={`${input} max-w-xs`} placeholder="Ex: 15" />
                        </Field>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Tuyauterie supplémentaire */}
              <div className={`rounded-lg border p-4 transition ${
                form.tuyauterieSupp ? "border-amber-400/40 bg-amber-50" : "border-slate-200 bg-white"
              }`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.tuyauterieSupp}
                    onChange={e => set("tuyauterieSupp", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-brand-navy" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Tuyauterie supplémentaire</p>
                    <p className="text-xs text-slate-400">Rallonges ou extensions de tuyauterie facturées en plus</p>
                    {form.tuyauterieSupp && (
                      <div className="mt-3">
                        <Field label="Longueur tuyauterie supplémentaire (mètres)">
                          <input type="number" step="1" min="0" value={form.tuyauterieSupplementaire}
                            onChange={e => set("tuyauterieSupplementaire", e.target.value)}
                            className={`${input} max-w-xs`} placeholder="Ex: 10" />
                        </Field>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </Section>

          {/* Section 4 — Conditions */}
          <Section title="Prix et conditions" icon="💶">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mode de règlement">
                <select value={form.modeReglement} onChange={e => set("modeReglement", e.target.value)}
                  className={input}>
                  <option value="">—</option>
                  {MODES_REGLEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="TVA (%)">
                <select value={form.tauxTVA} onChange={e => set("tauxTVA", e.target.value)}
                  className={input}>
                  <option value="20">20 %</option>
                  <option value="10">10 %</option>
                  <option value="5.5">5,5 %</option>
                  <option value="0">0 %</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Autres conditions / mentions">
                  <textarea value={form.conditions} onChange={e => set("conditions", e.target.value)}
                    rows={2} className={`${input} resize-none`}
                    placeholder="Ex: prix valable pour cubage ≤ 30 m³, supplément au-delà…" />
                </Field>
              </div>
            </div>
          </Section>

          {/* Section 5 — Notes */}
          <Section title="Notes internes" icon="📝">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} className={`${input} resize-none w-full`}
              placeholder="Notes confidentielles, retours terrain, historique négociation…" />
          </Section>
        </div>

        {/* ── Colonne latérale ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Prix */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-brand-navy px-4 py-3">
              <h3 className="text-sm font-bold text-white">Prix de la prestation</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <Field label="Prix HT (€)">
                <input type="number" step="10" min="0" value={form.prixHT}
                  onChange={e => set("prixHT", e.target.value)}
                  className={`${input} text-xl font-bold text-brand-navy`} placeholder="0.00" />
              </Field>
              {prixHT > 0 && (
                <div className="rounded-lg bg-brand-navy/5 border border-brand-navy/20 px-3 py-2.5 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>HT</span>
                    <span>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(prixHT)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>TVA {form.tauxTVA}%</span>
                    <span>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(tva)}</span>
                  </div>
                  <div className="flex justify-between border-t border-brand-navy/10 pt-1.5 text-base font-black text-brand-navy">
                    <span>TTC</span>
                    <span>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(ttc)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Récapitulatif pompe */}
          {(form.avecFleche || form.sansFleche) && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
              <p className="text-xs font-bold text-brand-navy uppercase tracking-wide mb-2">Pompe sélectionnée</p>
              {form.avecFleche && (
                <p className="text-slate-700">
                  🏗️ Flèche <strong>{form.flecheMetres || "—"} m</strong>
                </p>
              )}
              {form.sansFleche && (
                <p className="text-slate-700">
                  🔧 Tuyauterie <strong>{form.tuyauterieMetres || "—"} m</strong>
                </p>
              )}
              {form.tuyauterieSupp && (
                <p className="text-slate-700">
                  ➕ Tuyauterie supp. <strong>{form.tuyauterieSupplementaire || "—"} m</strong>
                </p>
              )}
              {form.cubagePrévu && (
                <p className="mt-2 text-xl font-black text-brand-navy">
                  {form.cubagePrévu} m³
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-2">
            <button onClick={handleSave} disabled={isPending}
              className="w-full rounded-lg bg-brand-orange py-2.5 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
              {isPending ? "Enregistrement…" : "💾 Enregistrer"}
            </button>
            <Link href={`/apercu/bon-reservation-pompe/${brp.id}`} target="_blank"
              className="block w-full rounded-lg border border-brand-navy py-2.5 text-center text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 transition">
              🖨 Aperçu / Imprimer
            </Link>
            {brp.statut === "BROUILLON" && (
              !confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} type="button"
                  className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-500 hover:bg-red-50 transition">
                  Supprimer
                </button>
              ) : (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-center">
                  <p className="text-xs text-red-700 mb-2 font-medium">Confirmer la suppression ?</p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={isPending}
                      className="flex-1 rounded bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      Oui, supprimer
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded border border-red-200 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      Annuler
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
    </FullscreenToggle>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
