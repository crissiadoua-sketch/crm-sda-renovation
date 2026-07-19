import type { CSSProperties } from "react";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatDate, urlFichier } from "@/lib/format";

type BET = { specialite: string; nom: string; representant?: string; email?: string; telephone?: string };
type BordRow = { destinataire: string; societe?: string; exemplaires?: number; dateEnvoi?: string; visa?: string };

export function PageDeGarde({ devis }: { devis: {
  numero: string; modeleCouverture: string; nomProjet?: string | null; photoProjetUrl?: string | null;
  photoRotation?: number | null; photoPositionX?: number | null; photoPositionY?: number | null;
  dateCreation: Date | string; dateValidite?: Date | string | null;
  objet?: string | null; referenceMarche?: string | null; lot?: string | null;
  moNom?: string | null; moRepresentant?: string | null; moEmail?: string | null; moTelephone?: string | null;
  moeNom?: string | null; moeRepresentant?: string | null; moeEmail?: string | null; moeTelephone?: string | null;
  bets?: string | null;
  egNom?: string | null; egRepresentant?: string | null; egEmail?: string | null; egTelephone?: string | null;
  spsNom?: string | null; spsRepresentant?: string | null; spsTelephone?: string | null;
  opcNom?: string | null; opcRepresentant?: string | null; opcTelephone?: string | null;
  bordereauDiffusion?: string | null;
  chantier: { nom: string; adresse?: string | null; ville?: string | null; codePostal?: string | null };
  client: { nom: string; prenom?: string | null; raisonSociale?: string | null; type?: string | null };
}}) {
  const bets: BET[] = (() => { try { return devis.bets ? JSON.parse(devis.bets) : []; } catch { return []; } })();
  const bord: BordRow[] = (() => { try { return devis.bordereauDiffusion ? JSON.parse(devis.bordereauDiffusion) : []; } catch { return []; } })();
  const adresseChantier = [devis.chantier.adresse, devis.chantier.codePostal, devis.chantier.ville].filter(Boolean).join(" ");
  const photoStyle: CSSProperties = {
    objectPosition: `${devis.photoPositionX ?? 50}% ${devis.photoPositionY ?? 50}%`,
    transform: devis.photoRotation ? `rotate(${devis.photoRotation}deg)` : undefined,
  };
  const clientNom = devis.client.type === "ENTREPRISE" ? (devis.client.raisonSociale || devis.client.nom) : `${devis.client.prenom ?? ""} ${devis.client.nom}`.trim();

  // Composants partagés
  const IntervenantRow = ({ label, nom, rep, email, tel }: { label: string; nom?: string | null; rep?: string | null; email?: string | null; tel?: string | null }) => (
    nom ? (
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wide w-32 align-top">{label}</td>
        <td className="py-2 pr-4 text-sm font-semibold text-slate-800 align-top">{nom}</td>
        <td className="py-2 pr-4 text-sm text-slate-600 align-top">{rep ?? "—"}</td>
        <td className="py-2 pr-4 text-xs text-slate-500 align-top">{email ?? ""}</td>
        <td className="py-2 text-xs text-slate-500 align-top">{tel ?? ""}</td>
      </tr>
    ) : null
  );

  const hasIntervenants = devis.moNom || devis.moeNom || bets.length > 0 || devis.egNom || devis.spsNom || devis.opcNom;

  // ── MODÈLE APPEL D'OFFRE ──────────────────────────────────────────────────
  if (devis.modeleCouverture === "APPEL_OFFRE") {
    return (
      <div className="relative min-h-[297mm] bg-white flex flex-col page-break-after-always">
        {/* Bandeau latéral navy */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#1E2F6E]" />
        <div className="ml-6 flex flex-col h-full px-8 py-10">
          {/* En-tête */}
          <div className="flex items-start justify-between border-b-2 border-[#F7941E] pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white px-5 py-3 shadow-sm border border-slate-100">
                <img src="/logo.png" alt="SDA Rénovation" className="h-20 w-auto object-contain" />
              </div>
              <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Référence</p>
              <p className="text-sm font-black text-[#1E2F6E]">{devis.numero}</p>
              {devis.referenceMarche && <p className="text-xs text-slate-500 mt-0.5">{devis.referenceMarche}</p>}
            </div>
          </div>

          {/* Titre */}
          <div className="mb-6 text-center">
            <div className="inline-block rounded-lg bg-gradient-to-r from-[#1E2F6E] to-[#29ABE2] px-8 py-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F7941E] mb-1">Réponse à l&apos;appel d&apos;offres</p>
              <p className="text-2xl font-black text-white uppercase tracking-tight">OFFRE DE PRIX</p>
            </div>
            {(devis.nomProjet || devis.objet) && (
              <p className="text-lg font-bold text-slate-700 mt-3">{devis.nomProjet || devis.objet}</p>
            )}
            {devis.lot && <p className="text-sm font-semibold text-[#F7941E] mt-1">Lot : {devis.lot}</p>}
          </div>

          {/* Zone photo */}
          <div className="relative mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-[#1E2F6E]/5 to-[#29ABE2]/10 h-80 flex items-center justify-center border border-[#1E2F6E]/10">
            {devis.photoProjetUrl ? (
              <img src={urlFichier(devis.photoProjetUrl)} alt="Photo du projet" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-semibold text-slate-400">Photo / visuel du projet</p>
              </div>
            )}
          </div>

          {/* Projet */}
          <div className="mb-6 rounded-lg border border-[#1E2F6E]/20 bg-[#1E2F6E]/5 px-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Opération</p>
                <p className="text-sm font-semibold text-slate-800">{devis.nomProjet || devis.chantier.nom}</p>
                <p className="text-xs text-slate-500">{adresseChantier}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Date d&apos;offre</p>
                <p className="text-sm font-semibold text-slate-800">{formatDate(devis.dateCreation)}</p>
                {devis.dateValidite && <p className="text-xs text-slate-500">Validité : {formatDate(devis.dateValidite)}</p>}
              </div>
            </div>
          </div>

          {/* Tableau intervenants */}
          {hasIntervenants && (
            <div className="mb-6 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Intervenants à l&apos;opération</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1E2F6E] to-[#29ABE2] text-white">
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide w-32">Qualité</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Société</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Représentant</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Email</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Téléphone</th>
                  </tr>
                </thead>
                <tbody>
                  <IntervenantRow label="Maître d'ouvrage" nom={devis.moNom} rep={devis.moRepresentant} email={devis.moEmail} tel={devis.moTelephone} />
                  <IntervenantRow label="Maître d'œuvre" nom={devis.moeNom} rep={devis.moeRepresentant} email={devis.moeEmail} tel={devis.moeTelephone} />
                  {bets.map((b, i) => <IntervenantRow key={i} label={`BET ${b.specialite}`} nom={b.nom} rep={b.representant} email={b.email} tel={b.telephone} />)}
                  <IntervenantRow label="Ent. Générale" nom={devis.egNom} rep={devis.egRepresentant} email={devis.egEmail} tel={devis.egTelephone} />
                  <IntervenantRow label="Coord. SPS" nom={devis.spsNom} rep={devis.spsRepresentant} tel={devis.spsTelephone} />
                  <IntervenantRow label="OPC" nom={devis.opcNom} rep={devis.opcRepresentant} tel={devis.opcTelephone} />
                  <IntervenantRow label="Entreprise" nom={COMPANY.nom} rep="Direction" email={COMPANY.email} tel={COMPANY.telephone} />
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-auto">
            {/* Bordereau diffusion */}
            {bord.length > 0 && <BordereauDiffusion rows={bord} />}
            {/* Pied */}
            <div className="border-t border-slate-200 pt-3 mt-4 text-center">
              <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MODÈLE RÉNOVATION ─────────────────────────────────────────────────────
  if (devis.modeleCouverture === "RENOVATION") {
    return (
      <div className="relative min-h-[297mm] bg-white flex flex-col page-break-after-always overflow-hidden">
        {/* Bandeau dégradé haut */}
        <div className="h-4 w-full bg-gradient-to-r from-[#1E2F6E] via-[#29ABE2] to-[#F7941E]" />

        <div className="flex flex-col flex-1 px-10 py-8">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="SDA Rénovation" className="h-20 w-auto object-contain" />
              <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p className="font-mono font-bold text-slate-600">{devis.numero}</p>
              <p>Émis le {formatDate(devis.dateCreation)}</p>
            </div>
          </div>

          {/* Zone photo */}
          <div className="relative mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-[#1E2F6E]/5 via-[#29ABE2]/5 to-slate-50 h-96 flex items-center justify-center border border-[#1E2F6E]/10">
            {devis.photoProjetUrl ? (
              <img src={urlFichier(devis.photoProjetUrl)} alt="Photo du projet" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">🏗️</div>
                <p className="text-sm font-semibold text-slate-400">Photo du projet</p>
                <p className="text-xs text-slate-400">(à ajouter dans l&apos;éditeur)</p>
              </div>
            )}
          </div>

          {/* Titre */}
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F7941E] mb-1">Devis de travaux</p>
            <h1 className="text-3xl font-black text-[#1E2F6E] uppercase tracking-tight">Rénovation</h1>
            <div className="w-12 h-1 bg-[#F7941E] mx-auto mt-2 rounded-full" />
            {(devis.nomProjet || devis.chantier.nom) && (
              <p className="text-lg font-bold text-slate-600 mt-3">{devis.nomProjet || devis.chantier.nom}</p>
            )}
            <p className="text-sm text-slate-500 mt-0.5">{adresseChantier}</p>
          </div>

          {/* Parties */}
          {hasIntervenants && (
            <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#F7941E] px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">Parties prenantes</p>
              </div>
              <div className="divide-y divide-slate-100">
                {devis.moNom && <PartieRow label="Maître d'ouvrage" nom={devis.moNom} rep={devis.moRepresentant} email={devis.moEmail} tel={devis.moTelephone} />}
                {devis.moeNom && <PartieRow label="Maître d'œuvre" nom={devis.moeNom} rep={devis.moeRepresentant} email={devis.moeEmail} tel={devis.moeTelephone} />}
                {bets.map((b, i) => <PartieRow key={i} label={`BET ${b.specialite}`} nom={b.nom} rep={b.representant} email={b.email} tel={b.telephone} />)}
                {devis.egNom && <PartieRow label="Entreprise générale" nom={devis.egNom} rep={devis.egRepresentant} email={devis.egEmail} tel={devis.egTelephone} />}
                {devis.spsNom && <PartieRow label="Coordinateur SPS" nom={devis.spsNom} rep={devis.spsRepresentant} tel={devis.spsTelephone} />}
                {devis.opcNom && <PartieRow label="OPC" nom={devis.opcNom} rep={devis.opcRepresentant} tel={devis.opcTelephone} />}
                <PartieRow label="Entreprise titulaire" nom={COMPANY.nom} rep="Direction" email={COMPANY.email} tel={COMPANY.telephone} color="#F7941E" />
              </div>
            </div>
          )}

          <div className="mt-auto">
            {bord.length > 0 && <BordereauDiffusion rows={bord} />}
            <div className="border-t border-slate-100 pt-3 mt-4 text-center">
              <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MODÈLE CONSTRUCTION NEUVE ─────────────────────────────────────────────
  if (devis.modeleCouverture === "CONSTRUCTION_NEUVE") {
    return (
      <div className="relative min-h-[297mm] bg-white flex flex-col page-break-after-always">
        {/* Liseré tricolore de marque */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1E2F6E] via-[#29ABE2] to-[#F7941E]" />

        {/* Grand bloc titre — dégradé clair aux couleurs de la marque */}
        <div className="bg-gradient-to-br from-[#1E2F6E] to-[#29ABE2] px-10 py-10 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white px-5 py-3 shadow-lg">
                <img src="/logo.png" alt="SDA Rénovation" className="h-20 w-auto object-contain" />
              </div>
              <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">{COMPANY.activite}</p>
            </div>
            <div className="text-right text-xs text-white/80">
              <p className="font-mono font-bold text-white">{devis.numero}</p>
            </div>
          </div>

          {/* Zone photo agrandie, plein format */}
          <div className="relative rounded-xl overflow-hidden bg-white/10 h-96 flex items-center justify-center mb-6 border border-white/20">
            {devis.photoProjetUrl ? (
              <img src={urlFichier(devis.photoProjetUrl)} alt="Photo du projet" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
            ) : (
              <div className="text-center">
                <div className="text-5xl mb-2">🏢</div>
                <p className="text-sm font-semibold text-white/60">Photo / visuel du projet</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <span className="inline-block rounded-full bg-[#F7941E] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white mb-2">Devis de travaux</span>
            <h1 className="text-3xl font-black uppercase tracking-tight">Construction Neuve</h1>
            {(devis.nomProjet || devis.chantier.nom) && (
              <p className="text-xl font-bold text-white/90 mt-2">{devis.nomProjet || devis.chantier.nom}</p>
            )}
            <p className="text-sm text-white/70 mt-1">{adresseChantier}</p>
            <p className="text-xs text-white/60 mt-2">Émis le {formatDate(devis.dateCreation)}</p>
          </div>
        </div>

        {/* Corps blanc */}
        <div className="flex-1 px-10 py-6 flex flex-col">
          {hasIntervenants && (
            <div className="mb-6 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Intervenants à l&apos;opération</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Qualité</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Société / Cabinet</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Représentant</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {devis.moNom && <tr className="hover:bg-slate-50"><td className="px-3 py-2 text-xs font-bold text-[#1E2F6E]">Maître d&apos;ouvrage</td><td className="px-3 py-2 font-medium">{devis.moNom}</td><td className="px-3 py-2 text-slate-600">{devis.moRepresentant ?? "—"}</td><td className="px-3 py-2 text-slate-500">{[devis.moEmail, devis.moTelephone].filter(Boolean).join(" · ")}</td></tr>}
                    {devis.moeNom && <tr className="hover:bg-slate-50"><td className="px-3 py-2 text-xs font-bold text-[#1E2F6E]">Maître d&apos;œuvre</td><td className="px-3 py-2 font-medium">{devis.moeNom}</td><td className="px-3 py-2 text-slate-600">{devis.moeRepresentant ?? "—"}</td><td className="px-3 py-2 text-slate-500">{[devis.moeEmail, devis.moeTelephone].filter(Boolean).join(" · ")}</td></tr>}
                    {bets.map((b, i) => <tr key={i} className="hover:bg-slate-50"><td className="px-3 py-2 text-xs font-bold text-[#29ABE2]">BET {b.specialite}</td><td className="px-3 py-2 font-medium">{b.nom}</td><td className="px-3 py-2 text-slate-600">{b.representant ?? "—"}</td><td className="px-3 py-2 text-slate-500">{[b.email, b.telephone].filter(Boolean).join(" · ")}</td></tr>)}
                    {devis.egNom && <tr className="hover:bg-slate-50"><td className="px-3 py-2 text-xs font-bold text-slate-500">Ent. Générale</td><td className="px-3 py-2 font-medium">{devis.egNom}</td><td className="px-3 py-2 text-slate-600">{devis.egRepresentant ?? "—"}</td><td className="px-3 py-2 text-slate-500">{[devis.egEmail, devis.egTelephone].filter(Boolean).join(" · ")}</td></tr>}
                    {devis.spsNom && <tr className="hover:bg-slate-50"><td className="px-3 py-2 text-xs font-bold text-slate-500">Coord. SPS</td><td className="px-3 py-2 font-medium">{devis.spsNom}</td><td className="px-3 py-2 text-slate-600">{devis.spsRepresentant ?? "—"}</td><td className="px-3 py-2 text-slate-500">{devis.spsTelephone ?? ""}</td></tr>}
                    {devis.opcNom && <tr className="hover:bg-slate-50"><td className="px-3 py-2 text-xs font-bold text-slate-500">OPC</td><td className="px-3 py-2 font-medium">{devis.opcNom}</td><td className="px-3 py-2 text-slate-600">{devis.opcRepresentant ?? "—"}</td><td className="px-3 py-2 text-slate-500">{devis.opcTelephone ?? ""}</td></tr>}
                    <tr className="bg-[#1E2F6E]/5"><td className="px-3 py-2 text-xs font-bold text-[#F7941E]">Entreprise titulaire</td><td className="px-3 py-2 font-bold text-[#1E2F6E]">{COMPANY.nom}</td><td className="px-3 py-2 text-slate-600">Direction</td><td className="px-3 py-2 text-slate-500">{COMPANY.email}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-auto">
            {bord.length > 0 && <BordereauDiffusion rows={bord} />}
            <div className="border-t border-slate-200 pt-3 mt-4 text-center">
              <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MODÈLE SERVICES (simplifié) ───────────────────────────────────────────
  return (
    <div className="relative min-h-[297mm] bg-white flex flex-col page-break-after-always">
      <div className="px-10 py-10 flex flex-col flex-1">
        {/* En-tête épuré */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SDA Rénovation" className="h-16 w-auto object-contain" />
            <p className="text-xs text-slate-400 uppercase tracking-wide">{COMPANY.activite}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-slate-600">{devis.numero}</p>
            <p className="text-xs text-slate-400">{formatDate(devis.dateCreation)}</p>
          </div>
        </div>

        {/* Titre centré minimal */}
        <div className="text-center mb-8 mt-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[#F7941E] font-semibold mb-3">Proposition commerciale</p>
          <h1 className="text-4xl font-black text-[#1E2F6E]">DEVIS</h1>
          <div className="w-20 h-1.5 bg-[#F7941E] mx-auto mt-3 rounded-full" />
          {(devis.nomProjet || devis.chantier.nom) && (
            <p className="text-xl font-semibold text-slate-600 mt-4">{devis.nomProjet || devis.chantier.nom}</p>
          )}
          {adresseChantier && <p className="text-sm text-slate-400 mt-1">{adresseChantier}</p>}
        </div>

        {/* Zone photo */}
        <div className="relative mb-8 rounded-xl overflow-hidden bg-gradient-to-br from-[#1E2F6E]/5 to-[#29ABE2]/10 h-80 flex items-center justify-center border border-[#1E2F6E]/10">
          {devis.photoProjetUrl ? (
            <img src={urlFichier(devis.photoProjetUrl)} alt="Photo du projet" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm font-semibold text-slate-400">Photo / visuel du projet</p>
            </div>
          )}
        </div>

        {/* Deux blocs : nous / client */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl bg-[#1E2F6E]/5 px-5 py-4 border border-[#1E2F6E]/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E2F6E] mb-2">Émetteur</p>
            <p className="font-bold text-slate-800">{COMPANY.nom}</p>
            <p className="text-xs text-slate-500 mt-0.5">{COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
            <p className="text-xs text-slate-500">{COMPANY.email}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-5 py-4 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Client</p>
            <p className="font-bold text-slate-800">{clientNom}</p>
            {devis.moNom && devis.moNom !== clientNom && <p className="text-xs text-slate-500 mt-0.5">MO : {devis.moNom}</p>}
          </div>
        </div>

        {/* Intervenants simplifiés si renseignés */}
        {(devis.moeNom || bets.length > 0) && (
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Intervenants</p>
            <div className="space-y-1.5">
              {devis.moeNom && <div className="flex items-center gap-2 text-xs"><span className="font-bold text-slate-500 w-28">Maître d&apos;œuvre</span><span className="text-slate-700">{devis.moeNom}{devis.moeRepresentant ? ` — ${devis.moeRepresentant}` : ""}</span></div>}
              {bets.map((b, i) => <div key={i} className="flex items-center gap-2 text-xs"><span className="font-bold text-slate-500 w-28">BET {b.specialite}</span><span className="text-slate-700">{b.nom}</span></div>)}
            </div>
          </div>
        )}

        <div className="mt-auto">
          {bord.length > 0 && <BordereauDiffusion rows={bord} />}
          <div className="border-t border-slate-100 pt-3 mt-4 text-center">
            <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant helper affichage intervenant en ligne (pour modèle Rénovation)
function PartieRow({ label, nom, rep, email, tel, color }: { label: string; nom?: string | null; rep?: string | null; email?: string | null; tel?: string | null; color?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <div className="w-32 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: color || "#1E2F6E" }}>{nom}</p>
        {rep && <p className="text-xs text-slate-500">{rep}</p>}
      </div>
      <div className="text-right text-xs text-slate-400">
        {email && <p>{email}</p>}
        {tel && <p>{tel}</p>}
      </div>
    </div>
  );
}

// Bordereau de diffusion
function BordereauDiffusion({ rows }: { rows: BordRow[] }) {
  return (
    <div className="mt-4" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-700 px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white">Bordereau de diffusion</p>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Destinataire</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Société</th>
              <th className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase">Expl.</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Date envoi</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-400 uppercase">Visa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="px-3 py-1.5 font-medium text-slate-700">{r.destinataire}</td>
                <td className="px-3 py-1.5 text-slate-500">{r.societe ?? "—"}</td>
                <td className="px-3 py-1.5 text-center text-slate-600">{r.exemplaires ?? 1}</td>
                <td className="px-3 py-1.5 text-slate-500">{r.dateEnvoi ?? "—"}</td>
                <td className="px-3 py-1.5 text-slate-400">{r.visa ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
