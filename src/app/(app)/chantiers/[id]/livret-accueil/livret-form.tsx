"use client";

import { useState, useTransition } from "react";
import { saveLivretAccueil } from "@/lib/actions/livret-accueil";

type Lot = { lot: string; nom: string; description: string; dtu: string };

type Props = {
  chantierId: string;
  defaultValues: {
    chefChantierNom: string;
    chefChantierContact: string;
    natureOuvrage: string;
    descriptionChantier: string;
    horairesChantier: string;
    stationnementAcces: string;
    remarqueVoisinage: string;
    lotsJson: string;
  };
  autoData: {
    natureOuvrage: string;
    descriptionChantier: string;
    lotsFromOM: Lot[];
  };
};

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";
const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-brand-navy border-b border-slate-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

export function LivretAccueilForm({ chantierId, defaultValues, autoData }: Props) {
  const [values, setValues] = useState(defaultValues);
  const [lots, setLots] = useState<Lot[]>(() => {
    try { return JSON.parse(defaultValues.lotsJson) as Lot[]; } catch { return []; }
  });
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(key: keyof typeof values, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    setSaved(false);
  }

  function setLot(i: number, key: keyof Lot, val: string) {
    setLots((prev) => prev.map((l, j) => j === i ? { ...l, [key]: val } : l));
    setSaved(false);
  }

  function addLot() {
    setLots((prev) => [...prev, { lot: `Lot ${prev.length + 1}`, nom: "", description: "", dtu: "" }]);
  }

  function removeLot(i: number) {
    setLots((prev) => prev.filter((_, j) => j !== i));
  }

  function handleAutoFill() {
    setValues((v) => ({
      ...v,
      natureOuvrage:       autoData.natureOuvrage || v.natureOuvrage,
      descriptionChantier: autoData.descriptionChantier || v.descriptionChantier,
    }));
    if (autoData.lotsFromOM.length > 0) setLots(autoData.lotsFromOM);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveLivretAccueil(chantierId, { ...values, lotsJson: JSON.stringify(lots) });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Bouton auto-remplissage */}
      {(autoData.lotsFromOM.length > 0 || autoData.descriptionChantier) && (
        <div className="rounded-xl border border-[#29ABE2]/30 bg-[#29ABE2]/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Remplissage automatique</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {autoData.lotsFromOM.length > 0
                ? `${autoData.lotsFromOM.length} lot(s) détecté(s) depuis les ordres de mission`
                : "Description du chantier disponible"}
              {autoData.descriptionChantier ? " · Description du chantier disponible" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="rounded-lg bg-[#29ABE2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E9AC8] transition"
          >
            ⚡ Remplir automatiquement depuis le CRM
          </button>
        </div>
      )}

      {/* Page 2 — Organigramme */}
      <Section title="Page 2 — Organigramme chantier">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Chef de chantier / référent sur site — Nom</label>
            <input className={inputCls} value={values.chefChantierNom} onChange={(e) => set("chefChantierNom", e.target.value)} placeholder="Prénom Nom" />
          </div>
          <div>
            <label className={labelCls}>Chef de chantier — Contact (téléphone)</label>
            <input className={inputCls} value={values.chefChantierContact} onChange={(e) => set("chefChantierContact", e.target.value)} placeholder="06 XX XX XX XX" />
          </div>
        </div>
      </Section>

      {/* Page 2 + 3 — Chantier */}
      <Section title="Page 2 — Nature et description du chantier">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Nature de l&apos;ouvrage (ligne courte)</label>
            <input className={inputCls} value={values.natureOuvrage} onChange={(e) => set("natureOuvrage", e.target.value)} placeholder="Ex. Rénovation complète d'une villa de 180 m²" />
          </div>
          <div>
            <label className={labelCls}>Description générale du chantier (page 3)</label>
            <textarea className={`${inputCls} min-h-[80px] resize-y`} value={values.descriptionChantier} onChange={(e) => set("descriptionChantier", e.target.value)} placeholder="Nature de l'ouvrage, surface, contexte, organisation en lots…" />
          </div>
        </div>
      </Section>

      {/* Lots */}
      <Section title="Page 2 & 3 — Corps de métier / Lots sous-traités">
        <div className="flex flex-col gap-3">
          {lots.map((lot, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E2F6E]">Lot {i + 1}</span>
                <button type="button" onClick={() => removeLot(i)} className="text-xs text-red-400 hover:text-red-600">Supprimer</button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Corps de métier / Intitulé du lot</label>
                  <input className={inputCls} value={lot.nom} onChange={(e) => setLot(i, "nom", e.target.value)} placeholder="Ex. Plomberie sanitaire CVC" />
                </div>
                <div>
                  <label className={labelCls}>DTU / Normes applicables</label>
                  <input className={inputCls} value={lot.dtu} onChange={(e) => setLot(i, "dtu", e.target.value)} placeholder="Ex. DTU 60.1, NF DTU 60.11" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description de l&apos;intervention prévue</label>
                <textarea className={`${inputCls} min-h-[60px] resize-y`} value={lot.description} onChange={(e) => setLot(i, "description", e.target.value)} placeholder="Travaux à réaliser…" />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addLot}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:border-brand-blue hover:text-brand-blue transition"
          >
            + Ajouter un lot
          </button>
        </div>
      </Section>

      {/* Page 6 — Environnement */}
      <Section title="Page 6 — Environnement & voisinage">
        <div className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Horaires de chantier</label>
            <input className={inputCls} value={values.horairesChantier} onChange={(e) => set("horairesChantier", e.target.value)} placeholder="Ex. Du lundi au vendredi, 7h30 – 18h00" />
          </div>
          <div>
            <label className={labelCls}>Modalités de stationnement et d&apos;accès</label>
            <textarea className={`${inputCls} min-h-[70px] resize-y`} value={values.stationnementAcces} onChange={(e) => set("stationnementAcces", e.target.value)} placeholder="Aire dédiée, voie publique, restrictions horaires, consignes riverains…" />
          </div>
        </div>
      </Section>

      {/* Page 3 — Remarque */}
      <Section title="Page 3 — Remarque contexte / voisinage">
        <label className={labelCls}>Remarque (contexte du chantier, points de vigilance)</label>
        <textarea className={`${inputCls} min-h-[70px] resize-y`} value={values.remarqueVoisinage} onChange={(e) => set("remarqueVoisinage", e.target.value)} placeholder="Zone résidentielle, voisinage sensible, nuisances à anticiper…" />
      </Section>

      {/* Boutons */}
      <div className="flex items-center gap-3 justify-end">
        {saved && <span className="text-sm text-emerald-600 font-medium">✓ Enregistré</span>}
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="rounded-lg bg-brand-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
