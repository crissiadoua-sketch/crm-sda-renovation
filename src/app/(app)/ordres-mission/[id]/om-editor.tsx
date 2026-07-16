"use client";

import { useState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChantierOM = {
  id: string;
  nom: string;
  adresse: string | null;
  dateDebut: string | null;
  dateFin: string | null;
};

type InterimaireOM = {
  id: string;
  nom: string;
  prenom: string;
  corpsEtat: string | null;
  agence: string | null;
};

type OmFormData = {
  interimaireId: string | null;
  chantierId: string | null;
  lieu: string | null;
  dateDebut: string;
  dateFin: string | null;
  titre: string;
  statut: string;
  description: string | null;
  notes: string | null;
};

const STATUTS = ["BROUILLON", "ENVOYE", "EN_COURS", "TERMINE", "ANNULE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

// ── Composant ─────────────────────────────────────────────────────────────────

export function OmEditor({
  om,
  chantiers,
  interimaires,
  action,
}: {
  om: OmFormData;
  chantiers: ChantierOM[];
  interimaires: InterimaireOM[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [chantierId, setChantierId] = useState(om.chantierId ?? "");
  const [lieu, setLieu] = useState(om.lieu ?? "");
  const [dateDebut, setDateDebut] = useState(om.dateDebut);
  const [dateFin, setDateFin] = useState(om.dateFin ?? "");

  // ── Pré-remplissage depuis chantier ────────────────────────────────────────
  const handleChantierChange = (newId: string) => {
    setChantierId(newId);
    const ch = chantiers.find((c) => c.id === newId);
    if (!ch) return;
    setLieu((prev) => prev || ch.adresse || "");
    setDateDebut((prev) => prev || ch.dateDebut || "");
    setDateFin((prev) => prev || ch.dateFin || "");
  };

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-brand-navy">Détails de la mission</p>
      <input type="hidden" name="type" value="INTERIMAIRE" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Intérimaire">
          <select
            name="interimaireId"
            defaultValue={om.interimaireId ?? ""}
            className={inputClasses}
          >
            <option value="">— Sélectionner —</option>
            {interimaires.map((i) => (
              <option key={i.id} value={i.id}>
                {i.prenom} {i.nom}{i.agence ? ` (${i.agence})` : ""} — {i.corpsEtat}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Statut">
          <select name="statut" defaultValue={om.statut} className={inputClasses}>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </Field>

        <div className="lg:col-span-1">
          <Field label="Objet de la mission *">
            <input
              name="titre"
              type="text"
              defaultValue={om.titre}
              required
              className={inputClasses}
            />
          </Field>
        </div>

        <Field label="Chantier">
          <select
            name="chantierId"
            value={chantierId}
            onChange={(e) => handleChantierChange(e.target.value)}
            className={inputClasses}
          >
            <option value="">Sans chantier</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </Field>

        <Field label="Lieu d'intervention">
          <input
            name="lieu"
            type="text"
            value={lieu}
            onChange={(e) => setLieu(e.target.value)}
            className={inputClasses}
            placeholder="Adresse du chantier"
          />
        </Field>

        <div />

        <Field label="Date de début *">
          <input
            name="dateDebut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
            className={inputClasses}
          />
        </Field>

        <Field label="Date de fin prévue">
          <input
            name="dateFin"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Description des tâches / consignes">
          <textarea
            name="description"
            defaultValue={om.description ?? ""}
            rows={4}
            className={`${inputClasses} resize-y`}
            placeholder="Tâches à effectuer, horaires, EPI requis, consignes de sécurité, accès chantier…"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Notes internes">
          <textarea
            name="notes"
            defaultValue={om.notes ?? ""}
            rows={2}
            className={`${inputClasses} resize-y`}
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end">
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
