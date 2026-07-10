export const dynamic = "force-dynamic";

import Link from "next/link";
import { Mail, CheckCircle, XCircle, Settings, ArrowLeft } from "lucide-react";
import { emailConfigure } from "@/lib/email";
import { TestEmailForm } from "./test-email-form";
import { getUser } from "@/lib/dal";

export default async function ParametresEmailPage() {
  const [user, configure] = await Promise.all([getUser(), Promise.resolve(emailConfigure())]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/parametres" className="text-sm text-brand-blue hover:underline">
          <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
          Retour aux paramètres
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <Mail className="h-6 w-6 text-brand-blue" />
          <h2 className="text-xl font-bold text-brand-navy">Messagerie — Boîte mail CRM</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Configurez l&apos;envoi d&apos;emails depuis <strong>contact@sda-renovation.com</strong> directement depuis le CRM.
        </p>
      </div>

      {/* Statut de configuration */}
      <div className={`rounded-xl border p-5 ${configure ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          {configure ? (
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div>
            <p className={`font-semibold ${configure ? "text-emerald-800" : "text-amber-800"}`}>
              {configure ? "Messagerie opérationnelle" : "Messagerie non configurée"}
            </p>
            <p className={`mt-1 text-sm ${configure ? "text-emerald-700" : "text-amber-700"}`}>
              {configure
                ? "Les variables SMTP sont présentes. Vous pouvez envoyer des devis, factures, BC et PV par email."
                : "Les variables d'environnement SMTP sont manquantes. Ajoutez-les dans Vercel pour activer l'envoi."}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions de configuration */}
      {!configure && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-slate-500" />
            <h3 className="font-semibold text-brand-navy">Comment configurer la messagerie</h3>
          </div>
          <ol className="space-y-4 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">1</span>
              <div>
                <p className="font-medium">Ouvrez le tableau de bord Vercel</p>
                <p className="text-slate-500 mt-1">Settings → Environment Variables → Production</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">2</span>
              <div>
                <p className="font-medium">Ajoutez les 4 variables suivantes</p>
                <div className="mt-2 space-y-1 rounded-lg bg-slate-50 border border-slate-200 p-3 font-mono text-xs">
                  <p><span className="text-brand-blue font-semibold">SMTP_HOST</span>=smtp.office365.com</p>
                  <p><span className="text-brand-blue font-semibold">SMTP_PORT</span>=587</p>
                  <p><span className="text-brand-blue font-semibold">SMTP_USER</span>=contact@sda-renovation.com</p>
                  <p><span className="text-brand-blue font-semibold">SMTP_PASS</span>=<span className="text-slate-400">[mot de passe d&apos;application]</span></p>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">3</span>
              <div>
                <p className="font-medium">Activez l&apos;authentification SMTP dans Microsoft 365</p>
                <p className="text-slate-500 mt-1">
                  Centre d&apos;administration Microsoft 365 → Utilisateurs → contact@sda-renovation.com →
                  Paramètres de messagerie → Authentification SMTP = Activé.
                </p>
                <p className="text-slate-500 mt-1">
                  Si l&apos;authentification à deux facteurs est activée, créez un <strong>mot de passe d&apos;application</strong>
                  dans votre compte Microsoft.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">4</span>
              <div>
                <p className="font-medium">Redéployez l&apos;application</p>
                <p className="text-slate-500 mt-1">
                  Après avoir ajouté les variables, déclenchez un redéploiement dans Vercel
                  pour que les nouvelles variables soient prises en compte.
                </p>
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* Test d'envoi */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-brand-navy">Test d&apos;envoi</h3>
        <p className="mb-4 text-sm text-slate-500">
          Envoyez un email de test pour vérifier que la configuration fonctionne.
        </p>
        <TestEmailForm defaultTo={user.email ?? ""} disabled={!configure} />
      </div>

      {/* Documents supportés */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-brand-navy">Documents envoyables par email</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: "Devis", href: "/devis", ok: true },
            { label: "Factures", href: "/factures", ok: true },
            { label: "Bons de commande", href: "/bons-commande", ok: true },
            { label: "BC Béton", href: "/bons-commande/beton", ok: true },
            { label: "PV de réception", href: "/pv-reception", ok: true },
            { label: "Contrats sous-traitance", href: "/contrats-sous-traitance", ok: false },
          ].map((doc) => (
            <div key={doc.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${doc.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
              {doc.ok ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <span className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              {doc.ok ? (
                <Link href={doc.href} className="hover:underline font-medium">{doc.label}</Link>
              ) : (
                <span>{doc.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
