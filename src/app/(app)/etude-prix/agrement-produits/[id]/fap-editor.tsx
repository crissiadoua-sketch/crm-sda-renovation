"use client";

import { useState, useTransition } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses, selectClasses } from "@/components/ui/fields";
import { DeleteButton } from "@/components/ui/delete-button";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import {
  sauvegarderFicheAgrement,
  supprimerFicheAgrement,
} from "@/lib/actions/fiches-agrement";

const STATUTS = [
  { value: "BROUILLON", label: "Brouillon", tone: "gray" as BadgeTone },
  { value: "SOUMIS", label: "Soumis", tone: "blue" as BadgeTone },
  { value: "VISA_SANS_OBS", label: "Visé sans obs.", tone: "green" as BadgeTone },
  { value: "VISA_AVEC_OBS", label: "Visé avec obs.", tone: "orange" as BadgeTone },
  { value: "SUSPENDU", label: "Suspendu", tone: "orange" as BadgeTone },
  { value: "REFUSE", label: "Refusé", tone: "red" as BadgeTone },
];

const AVIS_OPTIONS = [
  { value: "VISA_SANS_OBS", label: "Visé sans observations", tone: "green" as BadgeTone },
  { value: "VISA_AVEC_OBS", label: "Visé avec observations", tone: "orange" as BadgeTone },
  { value: "SUSPENDU", label: "Suspendu", tone: "orange" as BadgeTone },
];

type Fiche = {
  id: string;
  numero: string;
  modele: string;
  statut: string;
  chantierId: string | null;
  devisId: string | null;
  operation: string | null;
  lot: string | null;
  zone: string | null;
  niveau: string | null;
  emetteurNom: string | null;
  emetteurDate: string | null;
  marque: string | null;
  typeModele: string | null;
  descriptionColoris: string | null;
  localisation: string | null;
  documentationJointe: boolean;
  ficheTechnique: boolean;
  avisCSTB: boolean;
  fds: boolean;
  pvFeu: boolean;
  pvAcoustique: boolean;
  autresDocuments: string | null;
  avisMO: string | null;
  observationsMO: string | null;
  nomMO: string | null;
  prenomMO: string | null;
  dateMO: string | null;
  avisMOE: string | null;
  observationsMOE: string | null;
  nomMOE: string | null;
  prenomMOE: string | null;
  dateMOE: string | null;
  avisBC: string | null;
  observationsBC: string | null;
  nomBC: string | null;
  prenomBC: string | null;
  dateBC: string | null;
  notes: string | null;
};

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function AvisCard({
  titre,
  avis,
  observations,
  nom,
  prenom,
  date,
  onAvis,
  onObs,
  onNom,
  onPrenom,
  onDate,
}: {
  titre: string;
  avis: string | null;
  observations: string | null;
  nom: string | null;
  prenom: string | null;
  date: string | null;
  onAvis: (v: string | null) => void;
  onObs: (v: string) => void;
  onNom: (v: string) => void;
  onPrenom: (v: string) => void;
  onDate: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <h3 className="font-semibold text-brand-navy">{titre}</h3>
      <div className="flex gap-2 flex-wrap">
        {AVIS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onAvis(avis === opt.value ? null : opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              avis === opt.value
                ? opt.value === "VISA_SANS_OBS"
                  ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                  : opt.value === "SUSPENDU"
                  ? "border-amber-500 bg-amber-100 text-amber-700"
                  : "border-orange-500 bg-orange-100 text-orange-700"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Observations</label>
        <textarea
          value={observations ?? ""}
          onChange={(e) => onObs(e.target.value)}
          rows={3}
          className={`${inputClasses} resize-none`}
          placeholder="Observations éventuelles…"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nom</label>
          <input
            type="text"
            value={nom ?? ""}
            onChange={(e) => onNom(e.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Prénom</label>
          <input
            type="text"
            value={prenom ?? ""}
            onChange={(e) => onPrenom(e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
        <input
          type="date"
          value={date ?? ""}
          onChange={(e) => onDate(e.target.value)}
          className={inputClasses}
        />
      </div>
    </div>
  );
}

export function FapEditor({
  fiche,
  chantiers,
  devisList,
}: {
  fiche: Fiche;
  chantiers: { id: string; nom: string; reference: string }[];
  devisList: { id: string; numero: string; objet: string | null }[];
}) {
  const [tab, setTab] = useState<"operation" | "produit" | "avis" | "notes">("operation");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Champs
  const [statut, setStatut] = useState(fiche.statut);
  const [modele, setModele] = useState(fiche.modele);
  const [chantierId, setChantierId] = useState(fiche.chantierId ?? "");
  const [devisId, setDevisId] = useState(fiche.devisId ?? "");
  const [operation, setOperation] = useState(fiche.operation ?? "");
  const [lot, setLot] = useState(fiche.lot ?? "");
  const [zone, setZone] = useState(fiche.zone ?? "");
  const [niveau, setNiveau] = useState(fiche.niveau ?? "");
  const [emetteurNom, setEmetteurNom] = useState(fiche.emetteurNom ?? "");
  const [emetteurDate, setEmetteurDate] = useState(toDateInput(fiche.emetteurDate));
  // Produit
  const [marque, setMarque] = useState(fiche.marque ?? "");
  const [typeModele, setTypeModele] = useState(fiche.typeModele ?? "");
  const [descriptionColoris, setDescriptionColoris] = useState(fiche.descriptionColoris ?? "");
  const [localisation, setLocalisation] = useState(fiche.localisation ?? "");
  const [documentationJointe, setDocumentationJointe] = useState(fiche.documentationJointe);
  const [ficheTechnique, setFicheTechnique] = useState(fiche.ficheTechnique);
  const [avisCSTB, setAvisCSTB] = useState(fiche.avisCSTB);
  const [fds, setFds] = useState(fiche.fds);
  const [pvFeu, setPvFeu] = useState(fiche.pvFeu);
  const [pvAcoustique, setPvAcoustique] = useState(fiche.pvAcoustique);
  const [autresDocuments, setAutresDocuments] = useState(fiche.autresDocuments ?? "");
  // Avis MO
  const [avisMO, setAvisMO] = useState<string | null>(fiche.avisMO);
  const [observationsMO, setObservationsMO] = useState(fiche.observationsMO ?? "");
  const [nomMO, setNomMO] = useState(fiche.nomMO ?? "");
  const [prenomMO, setPrenomMO] = useState(fiche.prenomMO ?? "");
  const [dateMO, setDateMO] = useState(toDateInput(fiche.dateMO));
  // Avis MOE
  const [avisMOE, setAvisMOE] = useState<string | null>(fiche.avisMOE);
  const [observationsMOE, setObservationsMOE] = useState(fiche.observationsMOE ?? "");
  const [nomMOE, setNomMOE] = useState(fiche.nomMOE ?? "");
  const [prenomMOE, setPrenomMOE] = useState(fiche.prenomMOE ?? "");
  const [dateMOE, setDateMOE] = useState(toDateInput(fiche.dateMOE));
  // Avis BC
  const [avisBC, setAvisBC] = useState<string | null>(fiche.avisBC);
  const [observationsBC, setObservationsBC] = useState(fiche.observationsBC ?? "");
  const [nomBC, setNomBC] = useState(fiche.nomBC ?? "");
  const [prenomBC, setPrenomBC] = useState(fiche.prenomBC ?? "");
  const [dateBC, setDateBC] = useState(toDateInput(fiche.dateBC));
  // Notes
  const [notes, setNotes] = useState(fiche.notes ?? "");

  function handleSave() {
    startTransition(async () => {
      await sauvegarderFicheAgrement(fiche.id, {
        statut, modele,
        chantierId: chantierId || null,
        devisId: devisId || null,
        operation: operation || null,
        lot: lot || null, zone: zone || null, niveau: niveau || null,
        emetteurNom: emetteurNom || null,
        emetteurDate: emetteurDate || null,
        marque: marque || null, typeModele: typeModele || null,
        descriptionColoris: descriptionColoris || null,
        localisation: localisation || null,
        documentationJointe, ficheTechnique, avisCSTB, fds, pvFeu, pvAcoustique,
        autresDocuments: autresDocuments || null,
        avisMO, observationsMO: observationsMO || null,
        nomMO: nomMO || null, prenomMO: prenomMO || null, dateMO: dateMO || null,
        avisMOE, observationsMOE: observationsMOE || null,
        nomMOE: nomMOE || null, prenomMOE: prenomMOE || null, dateMOE: dateMOE || null,
        avisBC, observationsBC: observationsBC || null,
        nomBC: nomBC || null, prenomBC: prenomBC || null, dateBC: dateBC || null,
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  const statutInfo = STATUTS.find((s) => s.value === statut);

  const tabs = [
    { id: "operation" as const, label: "Opération" },
    { id: "produit" as const, label: "Produit proposé" },
    { id: "avis" as const, label: "Avis" },
    { id: "notes" as const, label: "Notes" },
  ];

  return (
    <FullscreenToggle>
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Main */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === t.id
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Onglet Opération */}
        {tab === "operation" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-navy">Modèle</label>
              <div className="flex gap-2">
                {[
                  { value: "SDA", label: "SDA" },
                  { value: "APPEL_OFFRE", label: "Appel d'offre" },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModele(m.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      modele === m.value
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "border-slate-300 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-navy">Statut global</label>
              <div className="flex gap-2 flex-wrap">
                {STATUTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatut(s.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      statut === s.value
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Opération</label>
                <input
                  type="text"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  className={inputClasses}
                  placeholder="Nom de l'opération"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Chantier</label>
                <select
                  value={chantierId}
                  onChange={(e) => setChantierId(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">— Aucun —</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} — {c.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Devis lié</label>
                <select
                  value={devisId}
                  onChange={(e) => setDevisId(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">— Aucun —</option>
                  {devisList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.numero}{d.objet ? ` — ${d.objet}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Lot</label>
                <input
                  type="text"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  className={inputClasses}
                  placeholder="Ex : 04 — Isolation"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Zone</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className={inputClasses}
                  placeholder="Ex : Façade Nord"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Niveau</label>
                <input
                  type="text"
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value)}
                  className={inputClasses}
                  placeholder="Ex : R+1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Émetteur (nom)</label>
                <input
                  type="text"
                  value={emetteurNom}
                  onChange={(e) => setEmetteurNom(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Date d'émission</label>
                <input
                  type="date"
                  value={emetteurDate}
                  onChange={(e) => setEmetteurDate(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>
        )}

        {/* Onglet Produit proposé */}
        {tab === "produit" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Marque</label>
                <input
                  type="text"
                  value={marque}
                  onChange={(e) => setMarque(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Type / Modèle</label>
                <input
                  type="text"
                  value={typeModele}
                  onChange={(e) => setTypeModele(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-600">Description / Coloris</label>
                <input
                  type="text"
                  value={descriptionColoris}
                  onChange={(e) => setDescriptionColoris(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-600">Localisation / Désignation</label>
                <input
                  type="text"
                  value={localisation}
                  onChange={(e) => setLocalisation(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-brand-navy">Documentation</p>
              <div className="flex flex-col gap-2">
                {[
                  { key: "documentationJointe", label: "Documentation jointe", val: documentationJointe, set: setDocumentationJointe },
                  { key: "ficheTechnique", label: "Fiche technique", val: ficheTechnique, set: setFicheTechnique },
                  { key: "avisCSTB", label: "Avis CSTB", val: avisCSTB, set: setAvisCSTB },
                  { key: "fds", label: "FDS (Fiche de données sécurité)", val: fds, set: setFds },
                  { key: "pvFeu", label: "PV Feu", val: pvFeu, set: setPvFeu },
                  { key: "pvAcoustique", label: "PV Acoustique", val: pvAcoustique, set: setPvAcoustique },
                ].map((doc) => (
                  <label key={doc.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.val}
                      onChange={(e) => doc.set(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-navy accent-brand-navy"
                    />
                    <span className="text-sm text-slate-700">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Autres documents</label>
              <textarea
                value={autresDocuments}
                onChange={(e) => setAutresDocuments(e.target.value)}
                rows={3}
                className={`${inputClasses} resize-none`}
                placeholder="Préciser les autres documents joints…"
              />
            </div>
          </div>
        )}

        {/* Onglet Avis */}
        {tab === "avis" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <AvisCard
              titre="Maître d'ouvrage"
              avis={avisMO}
              observations={observationsMO}
              nom={nomMO}
              prenom={prenomMO}
              date={dateMO}
              onAvis={setAvisMO}
              onObs={setObservationsMO}
              onNom={setNomMO}
              onPrenom={setPrenomMO}
              onDate={setDateMO}
            />
            <AvisCard
              titre="Maître d'œuvre"
              avis={avisMOE}
              observations={observationsMOE}
              nom={nomMOE}
              prenom={prenomMOE}
              date={dateMOE}
              onAvis={setAvisMOE}
              onObs={setObservationsMOE}
              onNom={setNomMOE}
              onPrenom={setPrenomMOE}
              onDate={setDateMOE}
            />
            <AvisCard
              titre="Bureau de contrôle"
              avis={avisBC}
              observations={observationsBC}
              nom={nomBC}
              prenom={prenomBC}
              date={dateBC}
              onAvis={setAvisBC}
              onObs={setObservationsBC}
              onNom={setNomBC}
              onPrenom={setPrenomBC}
              onDate={setDateBC}
            />
          </div>
        )}

        {/* Onglet Notes */}
        {tab === "notes" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-brand-navy">Notes internes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              className={`${inputClasses} resize-none`}
              placeholder="Notes, remarques, suivi…"
            />
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-64 flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
          <h3 className="font-semibold text-brand-navy text-sm">Statut global</h3>
          {statutInfo && (
            <Badge tone={statutInfo.tone} className="w-fit">{statutInfo.label}</Badge>
          )}

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Récapitulatif avis</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "MO", val: avisMO },
                { label: "MOE", val: avisMOE },
                { label: "BC", val: avisBC },
              ].map(({ label, val }) => {
                const avisOpt = AVIS_OPTIONS.find((a) => a.value === val);
                return (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    {avisOpt ? (
                      <Badge tone={avisOpt.tone} className="text-xs">{avisOpt.label}</Badge>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">Modèle</p>
            <p className="text-sm font-medium text-slate-700">
              {modele === "APPEL_OFFRE" ? "Appel d'offre" : "SDA"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-lg bg-gradient-to-r from-brand-orange to-brand-orange-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Enregistrement…" : saved ? "Enregistré !" : "Enregistrer"}
        </button>

        <button
          type="button"
          onClick={() => window.open(`/apercu/agrement-produit/${fiche.id}`, '_blank')}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 w-full justify-center"
        >
          🖨 Imprimer
        </button>

        <DeleteButton
          action={supprimerFicheAgrement.bind(null, fiche.id)}
          confirmMessage={`Supprimer la fiche ${fiche.numero} ?`}
        >
          Supprimer la fiche
        </DeleteButton>
      </aside>
    </div>
    </FullscreenToggle>
  );
}
