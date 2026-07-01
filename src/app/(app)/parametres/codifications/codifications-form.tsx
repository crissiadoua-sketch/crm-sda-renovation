"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CodificationsState } from "@/lib/actions/parametres";
import type { Codification } from "@/generated/prisma/client";

const CAT_LABELS: Record<string, string> = {
  DOCUMENT: "Documents",
  CLIENT: "Types de clients",
  TIERS: "Tiers (fournisseurs / sous-traitants)",
};

type LigneState = { code: string; prefixe: string; nbChiffres: number; prefixeAVenir: string };

function apercu(prefixe: string, nbChiffres: number, reinitAnnee: boolean) {
  const year = new Date().getFullYear();
  const num = "1".padStart(nbChiffres, "0");
  return reinitAnnee ? `${prefixe}-${year}-${num}` : `${prefixe}-${num}`;
}

type Action = (prev: CodificationsState, data: FormData) => Promise<CodificationsState>;

export function CodificationsForm({
  codifications,
  action,
}: {
  codifications: Codification[];
  action: Action;
}) {
  const [state, formAction] = useActionState<CodificationsState, FormData>(action, undefined);

  const [lignes, setLignes] = useState<LigneState[]>(
    codifications.map((c) => ({
      code: c.code,
      prefixe: c.prefixe,
      nbChiffres: c.nbChiffres,
      prefixeAVenir: c.prefixeAVenir ?? "",
    }))
  );

  function updateLigne(code: string, patch: Partial<LigneState>) {
    setLignes((prev) => prev.map((l) => (l.code === code ? { ...l, ...patch } : l)));
  }

  const byCode = Object.fromEntries(lignes.map((l) => [l.code, l]));
  const confByCode = Object.fromEntries(codifications.map((c) => [c.code, c]));

  const grouped: Record<string, Codification[]> = {};
  for (const c of codifications) {
    (grouped[c.categorie] ??= []).push(c);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lignes" value={JSON.stringify(lignes)} />

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Codifications enregistrées.</p>
      )}

      {(["DOCUMENT", "CLIENT", "TIERS"] as const).map((cat) => {
        const items = grouped[cat] ?? [];
        if (!items.length) return null;
        return (
          <div key={cat} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="font-semibold text-brand-navy">{CAT_LABELS[cat]}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Libellé</th>
                    <th className="px-4 py-2">Préfixe actif</th>
                    <th className="px-3 py-2 w-24">Chiffres</th>
                    <th className="px-4 py-2">Aperçu du prochain numéro</th>
                    {cat === "DOCUMENT" && (
                      <th className="px-4 py-2">Préfixe à venir (1er janv. {new Date().getFullYear() + 1})</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((c) => {
                    const l = byCode[c.code] ?? { code: c.code, prefixe: c.prefixe, nbChiffres: c.nbChiffres, prefixeAVenir: "" };
                    const conf = confByCode[c.code]!;
                    return (
                      <tr key={c.code} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">{c.code}</td>
                        <td className="px-4 py-2 text-slate-700">{c.label}</td>
                        <td className="px-4 py-2">
                          {conf.geleLegalement ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700">{c.prefixe}</span>
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                gel légal — modif. via "à venir" →
                              </span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={l.prefixe}
                              onChange={(e) => updateLigne(c.code, { prefixe: e.target.value })}
                              maxLength={12}
                              className="w-24 rounded border border-slate-300 px-2 py-1 font-mono text-sm focus:border-brand-blue focus:outline-none"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={l.nbChiffres}
                            onChange={(e) => updateLigne(c.code, { nbChiffres: Number(e.target.value) })}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-brand-blue focus:outline-none"
                          >
                            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">
                          {apercu(conf.geleLegalement ? c.prefixe : l.prefixe, l.nbChiffres, c.reinitialisationAnnee)}
                        </td>
                        {cat === "DOCUMENT" && (
                          <td className="px-4 py-2">
                            {conf.geleLegalement ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={l.prefixeAVenir}
                                  onChange={(e) => updateLigne(c.code, { prefixeAVenir: e.target.value })}
                                  maxLength={12}
                                  placeholder={`vide = conserver ${c.prefixe}`}
                                  className="w-40 rounded border border-slate-300 px-2 py-1 font-mono text-sm focus:border-brand-blue focus:outline-none"
                                />
                                {conf.prefixeAVenir && conf.anneeApplicationAVenir && (
                                  <span className="text-xs text-emerald-600">
                                    Programmé : {conf.prefixeAVenir} dès le 01/01/{conf.anneeApplicationAVenir}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer les codifications</SubmitButton>
      </div>
    </form>
  );
}
