"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  Building2,
  MapPin,
  Landmark,
  Percent,
  Calculator,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { regenerateLeadsApiKey, type ParametresState } from "@/lib/actions/parametres";
import type { Parametres } from "@/generated/prisma/client";

type Action = (prevState: ParametresState, formData: FormData) => Promise<ParametresState>;

function SectionHeader({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>{icon}</div>
      <div>
        <h3 className="font-semibold text-brand-navy">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function ParametresForm({ parametres, action }: { parametres: Parametres; action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  const [nomEntreprise, setNomEntreprise] = useState(parametres.nomEntreprise);
  const [adresse, setAdresse] = useState(parametres.adresse ?? "");
  const [codePostal, setCodePostal] = useState(parametres.codePostal ?? "");
  const [ville, setVille] = useState(parametres.ville ?? "");
  const [telephone, setTelephone] = useState(parametres.telephone ?? "");
  const [email, setEmail] = useState(parametres.email ?? "");
  const [emailPersonnalise, setEmailPersonnalise] = useState(parametres.emailPersonnalise ?? "");
  const [siret, setSiret] = useState(parametres.siret ?? "");
  const [tvaIntracom, setTvaIntracom] = useState(parametres.tvaIntracom ?? "");

  const villePreview = [codePostal, ville].filter(Boolean).join(" ");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form action={formAction} className="flex flex-col gap-5 lg:col-span-2">
        {state?.success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            ✅ Paramètres enregistrés avec succès ! Ils s&apos;appliquent immédiatement à vos devis et factures.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<Building2 className="h-5 w-5" />}
            title="Identité de l'entreprise"
            subtitle="Ces informations apparaissent sur tous vos devis et factures."
            color="bg-brand-blue/10 text-brand-blue"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Nom de l'entreprise"
              htmlFor="nomEntreprise"
              error={errors.nomEntreprise}
              className="sm:col-span-2"
            >
              <input
                id="nomEntreprise"
                name="nomEntreprise"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                required
                className={inputClasses}
              />
            </Field>
            <Field label="SIRET / SIREN" htmlFor="siret" error={errors.siret}>
              <input
                id="siret"
                name="siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="N° TVA intracommunautaire" htmlFor="tvaIntracom" error={errors.tvaIntracom}>
              <input
                id="tvaIntracom"
                name="tvaIntracom"
                value={tvaIntracom}
                onChange={(e) => setTvaIntracom(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="URL du logo" htmlFor="logoUrl" error={errors.logoUrl} className="sm:col-span-2">
              <input
                id="logoUrl"
                name="logoUrl"
                defaultValue={parametres.logoUrl ?? ""}
                placeholder="/logo.png"
                className={inputClasses}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<MapPin className="h-5 w-5" />}
            title="Coordonnées"
            subtitle="Adresse postale et moyens de contact de l'entreprise."
            color="bg-brand-orange/10 text-brand-orange-dark"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Adresse" htmlFor="adresse" error={errors.adresse} className="sm:col-span-2">
              <input
                id="adresse"
                name="adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Code postal" htmlFor="codePostal" error={errors.codePostal}>
              <input
                id="codePostal"
                name="codePostal"
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Ville" htmlFor="ville" error={errors.ville}>
              <input
                id="ville"
                name="ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Téléphone" htmlFor="telephone" error={errors.telephone}>
              <input
                id="telephone"
                name="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email}>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field
              label="Email personnalisé"
              htmlFor="emailPersonnalise"
              error={errors.emailPersonnalise}
              hint="Affiché dans l'en-tête des documents à la place de l'email principal (ex. christopher.siadoua@sda-renovation.com)"
            >
              <input
                id="emailPersonnalise"
                name="emailPersonnalise"
                type="email"
                value={emailPersonnalise}
                onChange={(e) => setEmailPersonnalise(e.target.value)}
                placeholder="prenom.nom@sda-renovation.com"
                className={inputClasses}
              />
            </Field>
            <Field label="Site web" htmlFor="siteWeb" error={errors.siteWeb} className="sm:col-span-2">
              <input id="siteWeb" name="siteWeb" defaultValue={parametres.siteWeb ?? ""} className={inputClasses} />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<Landmark className="h-5 w-5" />}
            title="Coordonnées bancaires"
            subtitle="Affichées sur les factures pour faciliter le règlement par virement."
            color="bg-brand-navy/10 text-brand-navy"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom de la banque" htmlFor="nomBanque" error={errors.nomBanque} className="sm:col-span-2">
              <input
                id="nomBanque"
                name="nomBanque"
                defaultValue={parametres.nomBanque ?? ""}
                placeholder="ex. Crédit Agricole Toulouse"
                className={inputClasses}
              />
            </Field>
            <Field label="Domiciliation / Agence" htmlFor="domiciliation" error={errors.domiciliation} className="sm:col-span-2">
              <input
                id="domiciliation"
                name="domiciliation"
                defaultValue={parametres.domiciliation ?? ""}
                placeholder="ex. Agence Cugnaux"
                className={inputClasses}
              />
            </Field>
            <Field label="IBAN" htmlFor="iban" error={errors.iban} className="sm:col-span-2">
              <input
                id="iban"
                name="iban"
                defaultValue={parametres.iban ?? ""}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className={`${inputClasses} font-mono tracking-wider`}
              />
            </Field>
            <Field label="BIC / SWIFT" htmlFor="bic" error={errors.bic}>
              <input
                id="bic"
                name="bic"
                defaultValue={parametres.bic ?? ""}
                placeholder="ex. AGRIFRPP831"
                className={`${inputClasses} font-mono`}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<Percent className="h-5 w-5" />}
            title="Devis & factures"
            subtitle="Valeurs par défaut et conditions générales appliquées aux nouveaux documents."
            color="bg-brand-blue/10 text-brand-blue"
          />
          <div className="flex flex-col gap-4">
            <Field
              label="Taux de TVA par défaut (%)"
              htmlFor="tauxTvaDefaut"
              error={errors.tauxTvaDefaut}
              className="sm:w-48"
            >
              <input
                id="tauxTvaDefaut"
                name="tauxTvaDefaut"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={parametres.tauxTvaDefaut}
                className={inputClasses}
              />
            </Field>
            <Field
              label="Conditions générales de vente — Devis"
              htmlFor="conditionsDevis"
              error={errors.conditionsDevis}
            >
              <textarea
                id="conditionsDevis"
                name="conditionsDevis"
                defaultValue={parametres.conditionsDevis ?? ""}
                rows={6}
                className={`${inputClasses} font-mono text-xs`}
              />
            </Field>
            <Field
              label="Conditions générales de vente — Factures"
              htmlFor="conditionsFacture"
              error={errors.conditionsFacture}
            >
              <textarea
                id="conditionsFacture"
                name="conditionsFacture"
                defaultValue={parametres.conditionsFacture ?? ""}
                rows={6}
                className={`${inputClasses} font-mono text-xs`}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<Calculator className="h-5 w-5" />}
            title="Comptabilité"
            subtitle="Adresse de transfert automatique vers votre expert-comptable (ex. iPaidThat)."
            color="bg-brand-orange/10 text-brand-orange-dark"
          />
          <Field label="Email du cabinet comptable" htmlFor="emailComptable" error={errors.emailComptable}>
            <input
              id="emailComptable"
              name="emailComptable"
              type="email"
              defaultValue={parametres.emailComptable ?? ""}
              placeholder="exemple@ipaidthat.io"
              className={inputClasses}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer les paramètres</SubmitButton>
        </div>
      </form>

      <div className="flex flex-col gap-6">
        <div className="sticky top-6 flex flex-col gap-6">
          <div className="rounded-xl border-2 border-dashed border-brand-blue/30 bg-white p-5 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <Sparkles className="h-4 w-4 text-brand-orange" />
              Aperçu en-tête de vos documents
            </p>
            <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-4">
              <Logo size="md" className="mb-2" />
              <p className="font-semibold text-brand-navy">{nomEntreprise || "SDA Rénovation"}</p>
              {adresse && <p className="text-sm text-slate-600">{adresse}</p>}
              {villePreview && <p className="text-sm text-slate-600">{villePreview}</p>}
              {telephone && <p className="text-sm text-slate-600">Tél : {telephone}</p>}
              {(emailPersonnalise || email) && (
                <p className="text-sm text-slate-600">Email : {emailPersonnalise || email}</p>
              )}
              {siret && <p className="mt-2 text-xs text-slate-400">SIRET/SIREN : {siret}</p>}
              {tvaIntracom && <p className="text-xs text-slate-400">N° TVA intracommunautaire : {tvaIntracom}</p>}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Cet aperçu se met à jour en direct pendant que vous modifiez les champs à gauche.
            </p>
          </div>

          <LeadsApiKeyCard leadsApiKey={parametres.leadsApiKey} />
        </div>
      </div>
    </div>
  );
}

function LeadsApiKeyCard({ leadsApiKey }: { leadsApiKey: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!leadsApiKey) return;
    await navigator.clipboard.writeText(leadsApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        icon={<KeyRound className="h-5 w-5" />}
        title="API Prospects"
        subtitle="Clé secrète utilisée par le formulaire de contact du site web pour créer des prospects."
        color="bg-brand-navy/10 text-brand-navy"
      />
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {leadsApiKey || "Aucune clé générée"}
        </code>
        <button type="button" onClick={copy} className={buttonClasses("secondary", "px-2 py-2")} title="Copier">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <form action={regenerateLeadsApiKey} className="mt-3">
        <button type="submit" className={buttonClasses("ghost", "text-sm")}>
          <RefreshCw className="h-4 w-4" />
          Régénérer la clé
        </button>
      </form>
    </div>
  );
}
