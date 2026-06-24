"use client";
import { useRef, useState } from "react";
import { updateDevisCouverture, uploadDevisPhoto, supprimerDevisPhoto } from "@/lib/actions/devis";
import { urlFichier } from "@/lib/format";

type BET = { specialite: string; nom: string; representant?: string; email?: string; telephone?: string };
type BordRecipient = { destinataire: string; societe?: string; exemplaires?: number; dateEnvoi?: string; visa?: string };

const MODELES = [
  { value: "APPEL_OFFRE", label: "Appel d'offre public/privé", desc: "Formel, DCE, tableau intervenants complet" },
  { value: "RENOVATION", label: "Travaux Rénovation", desc: "Graphique, photo projet, charte SDA" },
  { value: "CONSTRUCTION_NEUVE", label: "Construction Neuve", desc: "Élégant, moderne, photo plein format" },
  { value: "SERVICES", label: "Travaux / Services", desc: "Épuré, simplifié, intervenants réduits" },
];

const BET_SPECIALITES = ["Structure", "Thermique", "Fluides", "Acoustique", "Électricité", "Économiste", "Géotechnique", "Autre"];

export function DevisCouverture({ devis }: { devis: {
  id: string; modeleCouverture: string; nomProjet?: string | null; photoProjetUrl?: string | null;
  photoRotation?: number | null; photoPositionX?: number | null; photoPositionY?: number | null;
  moNom?: string | null; moRepresentant?: string | null; moEmail?: string | null; moTelephone?: string | null;
  moeNom?: string | null; moeRepresentant?: string | null; moeEmail?: string | null; moeTelephone?: string | null;
  bets?: string | null;
  egNom?: string | null; egRepresentant?: string | null; egEmail?: string | null; egTelephone?: string | null;
  spsNom?: string | null; spsRepresentant?: string | null; spsTelephone?: string | null;
  opcNom?: string | null; opcRepresentant?: string | null; opcTelephone?: string | null;
  bordereauDiffusion?: string | null;
}}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modele, setModele] = useState(devis.modeleCouverture);
  const [nomProjet, setNomProjet] = useState(devis.nomProjet ?? "");
  const [moNom, setMoNom] = useState(devis.moNom ?? "");
  const [moRep, setMoRep] = useState(devis.moRepresentant ?? "");
  const [moEmail, setMoEmail] = useState(devis.moEmail ?? "");
  const [moTel, setMoTel] = useState(devis.moTelephone ?? "");
  const [moeNom, setMoeNom] = useState(devis.moeNom ?? "");
  const [moeRep, setMoeRep] = useState(devis.moeRepresentant ?? "");
  const [moeEmail, setMoeEmail] = useState(devis.moeEmail ?? "");
  const [moeTel, setMoeTel] = useState(devis.moeTelephone ?? "");
  const [bets, setBets] = useState<BET[]>(() => {
    try { return devis.bets ? JSON.parse(devis.bets) : []; } catch { return []; }
  });
  const [egNom, setEgNom] = useState(devis.egNom ?? "");
  const [egRep, setEgRep] = useState(devis.egRepresentant ?? "");
  const [egEmail, setEgEmail] = useState(devis.egEmail ?? "");
  const [egTel, setEgTel] = useState(devis.egTelephone ?? "");
  const [spsNom, setSpsNom] = useState(devis.spsNom ?? "");
  const [spsRep, setSpsRep] = useState(devis.spsRepresentant ?? "");
  const [spsTel, setSpsTel] = useState(devis.spsTelephone ?? "");
  const [opcNom, setOpcNom] = useState(devis.opcNom ?? "");
  const [opcRep, setOpcRep] = useState(devis.opcRepresentant ?? "");
  const [opcTel, setOpcTel] = useState(devis.opcTelephone ?? "");
  const [bord, setBord] = useState<BordRecipient[]>(() => {
    try { return devis.bordereauDiffusion ? JSON.parse(devis.bordereauDiffusion) : []; } catch { return []; }
  });
  const [photoProjetUrl, setPhotoProjetUrl] = useState<string | null>(devis.photoProjetUrl ?? null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(devis.photoProjetUrl ? urlFichier(devis.photoProjetUrl) : null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoRotation, setPhotoRotation] = useState(devis.photoRotation ?? 0);
  const [photoPositionX, setPhotoPositionX] = useState(devis.photoPositionX ?? 50);
  const [photoPositionY, setPhotoPositionY] = useState(devis.photoPositionY ?? 50);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    const result = await uploadDevisPhoto(devis.id, file);
    setUploadingPhoto(false);
    if ("error" in result) {
      setPhotoError(result.error);
      setPhotoPreview(photoProjetUrl ? urlFichier(photoProjetUrl) : null);
      return;
    }
    setPhotoProjetUrl(result.url);
    setPhotoPreview(urlFichier(result.url));
    setPhotoRotation(0);
    setPhotoPositionX(50);
    setPhotoPositionY(50);
  };

  const handleRemovePhoto = async () => {
    if (photoInputRef.current) photoInputRef.current.value = "";
    setUploadingPhoto(true);
    await supprimerDevisPhoto(devis.id);
    setUploadingPhoto(false);
    setPhotoProjetUrl(null);
    setPhotoPreview(null);
    setPhotoRotation(0);
    setPhotoPositionX(50);
    setPhotoPositionY(50);
  };

  const rotatePhoto = (delta: number) => setPhotoRotation(prev => (prev + delta + 360) % 360);
  const recentrerPhoto = () => { setPhotoPositionX(50); setPhotoPositionY(50); };

  const addBet = () => setBets(prev => [...prev, { specialite: "Structure", nom: "" }]);
  const removeBet = (i: number) => setBets(prev => prev.filter((_, idx) => idx !== i));
  const updateBet = (i: number, field: keyof BET, val: string) =>
    setBets(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));

  const addBord = () => setBord(prev => [...prev, { destinataire: "" }]);
  const removeBord = (i: number) => setBord(prev => prev.filter((_, idx) => idx !== i));
  const updateBord = (i: number, field: keyof BordRecipient, val: string | number) =>
    setBord(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));

  const handleSave = async () => {
    setSaving(true);
    await updateDevisCouverture(devis.id, {
      modeleCouverture: modele,
      nomProjet: nomProjet || null,
      photoProjetUrl,
      photoRotation,
      photoPositionX,
      photoPositionY,
      moNom: moNom || null, moRepresentant: moRep || null, moEmail: moEmail || null, moTelephone: moTel || null,
      moeNom: moeNom || null, moeRepresentant: moeRep || null, moeEmail: moeEmail || null, moeTelephone: moeTel || null,
      bets: bets.length ? JSON.stringify(bets) : null,
      egNom: egNom || null, egRepresentant: egRep || null, egEmail: egEmail || null, egTelephone: egTel || null,
      spsNom: spsNom || null, spsRepresentant: spsRep || null, spsTelephone: spsTel || null,
      opcNom: opcNom || null, opcRepresentant: opcRep || null, opcTelephone: opcTel || null,
      bordereauDiffusion: bord.length ? JSON.stringify(bord) : null,
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2F6E]/30";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1";

  return (
    <div className="space-y-6">
      {/* Modèle */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide mb-4">Modèle de page de garde</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MODELES.map(m => (
            <button key={m.value} type="button" onClick={() => setModele(m.value)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${modele === m.value ? "border-[#1E2F6E] bg-[#1E2F6E]/5" : "border-slate-200 hover:border-slate-300"}`}>
              <p className={`text-sm font-bold ${modele === m.value ? "text-[#1E2F6E]" : "text-slate-700"}`}>{m.label}</p>
              <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Projet */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide mb-4">Informations projet</h3>
        <div className="grid gap-4">
          <div className="sm:max-w-sm">
            <label className={labelCls}>Nom du projet</label>
            <input className={inputCls} value={nomProjet} onChange={e => setNomProjet(e.target.value)} placeholder="Ex : Rénovation Appartement Dupont" />
          </div>
          <div>
            <label className={labelCls}>Photo / visuel du projet</label>
            <div className="flex flex-wrap items-start gap-4">
              {photoPreview && (
                <div className="relative h-28 w-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <img
                    src={photoPreview}
                    alt="Photo du projet"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${photoPositionX}% ${photoPositionY}%`, transform: photoRotation ? `rotate(${photoRotation}deg)` : undefined }}
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    title="Retirer la photo"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {uploadingPhoto ? "Envoi…" : photoPreview ? "Changer la photo" : "Importer une photo"}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <p className="text-xs text-slate-400">JPEG, PNG — 8 Mo max. Apparaît sur la page de garde du devis.</p>
                {photoError && <p className="text-xs text-red-500">{photoError}</p>}
              </div>
            </div>

            {photoPreview && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:max-w-sm">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => rotatePhoto(-90)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50" title="Pivoter à gauche">⟲ 90°</button>
                    <button type="button" onClick={() => rotatePhoto(90)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50" title="Pivoter à droite">⟳ 90°</button>
                  </div>
                  <button type="button" onClick={recentrerPhoto} className="text-xs font-semibold text-[#1E2F6E] hover:underline">
                    Recentrer
                  </button>
                </div>
                <div>
                  <label className={labelCls}>Cadrage horizontal</label>
                  <input type="range" min={0} max={100} value={photoPositionX} onChange={e => setPhotoPositionX(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className={labelCls}>Cadrage vertical</label>
                  <input type="range" min={0} max={100} value={photoPositionY} onChange={e => setPhotoPositionY(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maître d'ouvrage */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide mb-4">Maître d'ouvrage (MO)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Nom / Organisme</label><input className={inputCls} value={moNom} onChange={e => setMoNom(e.target.value)} /></div>
          <div><label className={labelCls}>Représentant</label><input className={inputCls} value={moRep} onChange={e => setMoRep(e.target.value)} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={moEmail} onChange={e => setMoEmail(e.target.value)} /></div>
          <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={moTel} onChange={e => setMoTel(e.target.value)} /></div>
        </div>
      </div>

      {/* Maître d'œuvre */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide mb-4">Maître d'œuvre (MOE)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Cabinet / Société</label><input className={inputCls} value={moeNom} onChange={e => setMoeNom(e.target.value)} /></div>
          <div><label className={labelCls}>Représentant</label><input className={inputCls} value={moeRep} onChange={e => setMoeRep(e.target.value)} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={moeEmail} onChange={e => setMoeEmail(e.target.value)} /></div>
          <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={moeTel} onChange={e => setMoeTel(e.target.value)} /></div>
        </div>
      </div>

      {/* BETs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide">Bureaux d'études techniques (BET)</h3>
          <button type="button" onClick={addBet} className="rounded-lg bg-[#1E2F6E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E2F6E]/90">+ Ajouter un BET</button>
        </div>
        {bets.length === 0 && <p className="text-sm text-slate-400">Aucun BET renseigné.</p>}
        <div className="space-y-3">
          {bets.map((b, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-5 items-start rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div>
                <label className={labelCls}>Spécialité</label>
                <select className={inputCls} value={b.specialite} onChange={e => updateBet(i, "specialite", e.target.value)}>
                  {BET_SPECIALITES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Cabinet</label><input className={inputCls} value={b.nom} onChange={e => updateBet(i, "nom", e.target.value)} /></div>
              <div><label className={labelCls}>Représentant</label><input className={inputCls} value={b.representant ?? ""} onChange={e => updateBet(i, "representant", e.target.value)} /></div>
              <div><label className={labelCls}>Email</label><input className={inputCls} value={b.email ?? ""} onChange={e => updateBet(i, "email", e.target.value)} /></div>
              <div className="flex flex-col">
                <label className={labelCls}>Téléphone</label>
                <div className="flex gap-2">
                  <input className={inputCls} value={b.telephone ?? ""} onChange={e => updateBet(i, "telephone", e.target.value)} />
                  <button type="button" onClick={() => removeBet(i)} className="rounded-lg border border-red-200 px-2 text-red-400 hover:bg-red-50">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EG + SPS + OPC */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide mb-4">Autres intervenants</h3>
        <div className="grid gap-5">
          {/* EG */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Entreprise générale (EG)</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div><label className={labelCls}>Nom</label><input className={inputCls} value={egNom} onChange={e => setEgNom(e.target.value)} /></div>
              <div><label className={labelCls}>Représentant</label><input className={inputCls} value={egRep} onChange={e => setEgRep(e.target.value)} /></div>
              <div><label className={labelCls}>Email</label><input className={inputCls} value={egEmail} onChange={e => setEgEmail(e.target.value)} /></div>
              <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={egTel} onChange={e => setEgTel(e.target.value)} /></div>
            </div>
          </div>
          {/* SPS */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Coordinateur SPS</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={labelCls}>Nom / Cabinet</label><input className={inputCls} value={spsNom} onChange={e => setSpsNom(e.target.value)} /></div>
              <div><label className={labelCls}>Représentant</label><input className={inputCls} value={spsRep} onChange={e => setSpsRep(e.target.value)} /></div>
              <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={spsTel} onChange={e => setSpsTel(e.target.value)} /></div>
            </div>
          </div>
          {/* OPC */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">OPC (Ordonnancement, Pilotage, Coordination)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={labelCls}>Nom / Cabinet</label><input className={inputCls} value={opcNom} onChange={e => setOpcNom(e.target.value)} /></div>
              <div><label className={labelCls}>Représentant</label><input className={inputCls} value={opcRep} onChange={e => setOpcRep(e.target.value)} /></div>
              <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={opcTel} onChange={e => setOpcTel(e.target.value)} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bordereau de diffusion */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#1E2F6E] uppercase tracking-wide">Bordereau de diffusion</h3>
          <button type="button" onClick={addBord} className="rounded-lg bg-[#1E2F6E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E2F6E]/90">+ Ajouter</button>
        </div>
        {bord.length === 0 && <p className="text-sm text-slate-400">Aucun destinataire renseigné.</p>}
        <div className="space-y-2">
          {bord.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-5 items-end rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div><label className={labelCls}>Destinataire</label><input className={inputCls} value={r.destinataire} onChange={e => updateBord(i, "destinataire", e.target.value)} /></div>
              <div><label className={labelCls}>Société</label><input className={inputCls} value={r.societe ?? ""} onChange={e => updateBord(i, "societe", e.target.value)} /></div>
              <div><label className={labelCls}>Exemplaires</label><input className={inputCls} type="number" value={r.exemplaires ?? 1} onChange={e => updateBord(i, "exemplaires", parseInt(e.target.value))} /></div>
              <div><label className={labelCls}>Date envoi</label><input className={inputCls} type="date" value={r.dateEnvoi ?? ""} onChange={e => updateBord(i, "dateEnvoi", e.target.value)} /></div>
              <div className="flex gap-2 items-end">
                <div className="flex-1"><label className={labelCls}>Visa</label><input className={inputCls} value={r.visa ?? ""} onChange={e => updateBord(i, "visa", e.target.value)} /></div>
                <button type="button" onClick={() => removeBord(i)} className="rounded-lg border border-red-200 px-2 py-2 text-red-400 hover:bg-red-50">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bouton enregistrer */}
      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving}
          className="rounded-lg bg-[#1E2F6E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1B3F94] disabled:opacity-50">
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer la page de garde"}
        </button>
      </div>
    </div>
  );
}
