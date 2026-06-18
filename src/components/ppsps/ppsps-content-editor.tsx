"use client";

import { useState, useRef } from "react";
import { saveContenuLibre } from "@/lib/actions/ppsps";
import { RotateCcw, Save } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Default content templates
// ---------------------------------------------------------------------------

const DEFAULTS_APPEL_OFFRE: Record<string, string> = {
  objet: `Le présent Plan Particulier de Sécurité et de Protection de la Santé (PPSPS) a été établi conformément aux articles L.4532-1 et suivants du Code du travail et au décret n°94-1159 du 26 décembre 1994 modifié par le décret n°2003-68 du 24 janvier 2003.

Il définit les mesures propres à prévenir les risques découlant de l'interférence des activités des différents intervenants sur le chantier, de la succession de leurs activités lorsqu'une intervention laisse subsister après son achèvement des risques pour les autres entreprises.`,

  description: `[À compléter : description détaillée de l'opération, nature et étendue des travaux, planning prévisionnel]`,

  organisation: `La base-vie sera installée conformément au plan d'installation de chantier joint.

Les zones de stockage des matériaux seront délimitées et balisées. Les voies de circulation piétons/engins seront séparées et clairement identifiées.

La signalisation de chantier sera conforme à la réglementation en vigueur (arrêté du 15 juillet 1974 modifié).`,

  installations: `Les installations sanitaires et d'hébergement seront conformes aux articles R.4513-1 et suivants du Code du travail, comprenant :
• Vestiaires : armoires individuelles, lavabos à eau courante chaude et froide
• Réfectoire équipé : micro-ondes, réfrigérateur, eau potable
• WC : 1 pour 10 travailleurs minimum
• Armoire à pharmacie conforme`,

  hygiene: `Équipements de Protection Individuelle (EPI) obligatoires sur l'ensemble du chantier :
• Casque de chantier (EN 397)
• Chaussures de sécurité S3 (EN ISO 20345)
• Gilet haute visibilité classe 2 minimum
• Gants de protection adaptés aux tâches

EPI spécifiques selon les phases de travaux définis dans l'analyse des risques.

Formations et habilitations requises : CACES selon engins utilisés, habilitations électriques (B0/H0 minimum), AIPR pour travaux à proximité de réseaux.`,

  urgence: `PROCÉDURE EN CAS D'ACCIDENT :

1. PROTÉGER : Sécuriser la zone, éviter tout sur-accident
2. ALERTER : Appeler les secours (voir liste des contacts de secours)
3. SECOURIR : Prodiguez les premiers secours en attendant l'arrivée des secours
4. Ne pas déplacer la victime sauf danger immédiat
5. Prévenir immédiatement le Coordonnateur SPS
6. Rédiger le registre d'accident (date, heure, circonstances, témoins)
7. Conserver la zone en l'état jusqu'à l'arrivée des autorités`,

  dispositionsCommunes: `Dispositions communes à tous les intervenants sur le chantier :

• Obligation du port des EPI sur l'ensemble du chantier
• Respect de la signalisation et du plan de circulation
• Interdiction de fumer sur le chantier (loi Evin)
• Interdiction de consommer des boissons alcoolisées sur le chantier
• Rangement et nettoyage quotidien de la zone de travail
• Signalement immédiat de tout incident ou situation dangereuse au chef de chantier
• Obligation de participation aux causeries sécurité hebdomadaires`,

  reseaux: `Avant tout commencement de travaux, les réseaux souterrains et aériens seront identifiés :
• Déclaration de projet de travaux (DT) auprès de Téléservice Réseaux et Canalisations
• Demande de DICT (Déclaration d'Intention de Commencement de Travaux) à tous les exploitants de réseaux
• Marquage-piquetage des réseaux selon guide technique en vigueur (arrêté du 15 février 2012)

En présence de réseaux enterrés : travaux manuels à moins de 1,50m des réseaux.`,
};

const DEFAULTS_PERSONNALISE: Record<string, string> = {
  presentation: `[Description des travaux prévus à votre domicile]`,

  securite: `Pour votre sécurité et celle de nos équipes, voici les règles de sécurité appliquées sur votre chantier :

• Nos techniciens portent les équipements de protection adaptés
• La zone de travaux est balisée et sécurisée
• Accès au chantier interdit aux enfants
• Nos équipes disposent des formations et habilitations nécessaires`,

  urgence: `En cas d'urgence sur le chantier, nos équipes disposent des contacts suivants :
SAMU : 15 | Pompiers : 18 | Police : 17 | Urgences : 112

Notre chef de chantier est joignable 7j/7 pour toute situation d'urgence.`,

  regles: `Règles de bon fonctionnement du chantier :
• Horaires de travaux : du lundi au vendredi de 8h à 18h (sauf accord préalable)
• Accès au chantier coordonné avec votre présence ou par clé confiée
• Nettoyage quotidien de la zone d'intervention
• Information quotidienne sur l'avancement des travaux`,
};

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

type SectionDef = {
  key: string;
  title: string;
};

const SECTIONS_APPEL_OFFRE: SectionDef[] = [
  { key: "objet", title: "Objet du PPSPS" },
  { key: "description", title: "Description de l'opération" },
  { key: "organisation", title: "Organisation du chantier" },
  { key: "installations", title: "Installations de chantier" },
  { key: "hygiene", title: "Mesures d'hygiène et EPI" },
  { key: "urgence", title: "Procédure d'urgence" },
  { key: "dispositionsCommunes", title: "Dispositions communes à tous les intervenants" },
  { key: "reseaux", title: "Voies et réseaux divers" },
];

const SECTIONS_PERSONNALISE: SectionDef[] = [
  { key: "presentation", title: "Présentation des travaux" },
  { key: "securite", title: "Sécurité sur le chantier" },
  { key: "urgence", title: "Contacts d'urgence" },
  { key: "regles", title: "Règles de vie du chantier" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PPSPSContentEditor({
  ppspsId,
  modele,
  initialSections,
}: {
  ppspsId: string;
  modele: string;
  initialSections: Record<string, string>;
}) {
  const defaults = modele === "APPEL_OFFRE" ? DEFAULTS_APPEL_OFFRE : DEFAULTS_PERSONNALISE;
  const sectionDefs =
    modele === "APPEL_OFFRE" ? SECTIONS_APPEL_OFFRE : SECTIONS_PERSONNALISE;

  // Initialize: use saved content if present, else use default
  const [sections, setSections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const { key } of sectionDefs) {
      init[key] = initialSections[key] ?? defaults[key] ?? "";
    }
    return init;
  });

  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleChange(key: string, value: string) {
    setSaved(false);
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset(key: string) {
    setSaved(false);
    setSections((prev) => ({ ...prev, [key]: defaults[key] ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("contenuLibre", JSON.stringify(sections));
      await saveContenuLibre(ppspsId, fd);
      setSaved(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      {sectionDefs.map(({ key, title }) => {
        const isModified = sections[key] !== (defaults[key] ?? "");
        return (
          <div
            key={key}
            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="font-semibold text-brand-navy text-sm">{title}</span>
              <div className="flex items-center gap-2">
                {isModified ? (
                  <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-medium text-brand-orange-dark">
                    Modifié
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                    Contenu par défaut
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleReset(key)}
                  title="Réinitialiser au contenu par défaut"
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="p-4">
              <textarea
                value={sections[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={6}
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                style={{ minHeight: "9rem" }}
              />
            </div>
          </div>
        );
      })}

      {/* Save button */}
      <div className="flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {saved && (
          <span className="text-sm font-medium text-emerald-600">
            Contenu enregistré avec succès.
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses("primary")}
        >
          <Save className="h-4 w-4" />
          {pending ? "Enregistrement…" : "Enregistrer le contenu"}
        </button>
      </div>
    </form>
  );
}
