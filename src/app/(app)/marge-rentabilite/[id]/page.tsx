import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, ShoppingCart, Package, HardHat, Wallet, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";

function pct(v: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, (v / total) * 100);
}

function Section({
  icon,
  title,
  total,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          {icon}
          {title}
        </div>
        <span className="font-mono font-bold text-brand-navy">{formatEuros(total)}</span>
      </div>
      {children}
    </div>
  );
}

export default async function MargeRentabiliteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const chantier = await prisma.chantier.findUnique({
    where: { id },
    include: {
      devis: { where: { statut: "ACCEPTE", type: "INITIAL" } },
      factures: { where: { statut: { not: "ANNULEE" } }, orderBy: { dateEmission: "asc" } },
      bonsCommande: {
        where: { statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } },
        include: { fournisseur: true, lignes: true },
        orderBy: { dateCreation: "asc" },
      },
      bonsCommandeBeton: {
        where: { statut: { in: ["CONFIRME", "LIVRE"] } },
        include: { fournisseur: true },
        orderBy: { createdAt: "asc" },
      },
      contrats: {
        where: { statut: { in: ["SIGNE", "TERMINE"] } },
        include: { sousTraitant: true },
        orderBy: { dateDebut: "asc" },
      },
      depenses: {
        where: { type: "REEL" },
        include: { fournisseur: true },
        orderBy: { date: "asc" },
      },
      reservationsPompe: {
        where: { statut: "CONFIRME" },
        include: { fournisseur: true },
        orderBy: { dateReservation: "asc" },
      },
    },
  });

  if (!chantier) notFound();

  const caPrévu = chantier.devis.reduce((s, d) => s + d.totalHT, 0);
  const caFacturé = chantier.factures.reduce((s, f) => s + f.totalHT, 0);
  const montantEncaissé = chantier.factures.reduce((s, f) => s + f.montantPaye, 0);
  const coutBC = chantier.bonsCommande.reduce((s, bc) => s + bc.totalHT, 0);
  const coutBCB = chantier.bonsCommandeBeton.reduce((s, bcb) => s + bcb.totalHT, 0);
  const coutCST = chantier.contrats.reduce((s, ct) => s + (ct.montantHT ?? 0), 0);
  const coutDepenses = chantier.depenses.reduce((s, d) => s + d.montant, 0);
  const coutPompe = chantier.reservationsPompe.reduce((s, p) => s + (p.prixHT ?? 0), 0);
  const coutsEngagés = coutBC + coutBCB + coutCST + coutDepenses + coutPompe;
  const margeBrute = caFacturé - coutsEngagés;
  const margePrevisionnelle = caPrévu - coutsEngagés;
  const rentabilité = caFacturé > 0 ? (margeBrute / caFacturé) * 100 : null;
  const dérive = caPrévu > 0 && coutsEngagés > caPrévu;
  const référence = caPrévu || caFacturé || coutsEngagés;

  const kpis = [
    { label: "CA prévu (devis accepté)", value: formatEuros(caPrévu), color: "text-brand-navy" },
    { label: "CA facturé", value: formatEuros(caFacturé), color: "text-brand-navy" },
    { label: "Encaissé", value: formatEuros(montantEncaissé), color: "text-green-600" },
    {
      label: "Coûts engagés (DS réel)",
      value: formatEuros(coutsEngagés),
      color: dérive ? "text-red-600 font-bold" : "text-slate-700",
    },
    {
      label: caFacturé > 0 ? "Marge brute réelle" : "Marge prévisionnelle",
      value: formatEuros(caFacturé > 0 ? margeBrute : margePrevisionnelle),
      color: (caFacturé > 0 ? margeBrute : margePrevisionnelle) >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Rentabilité",
      value:
        rentabilité !== null
          ? `${rentabilité >= 0 ? "+" : ""}${rentabilité.toFixed(1)}%`
          : caFacturé === 0
            ? "non facturé"
            : "—",
      color:
        rentabilité === null
          ? "text-slate-400"
          : rentabilité >= 20
            ? "text-green-600"
            : rentabilité >= 10
              ? "text-emerald-600"
              : rentabilité >= 0
                ? "text-orange-500"
                : "text-red-600",
    },
  ];

  const costItems = [
    { label: "Matériaux (BCs)", value: coutBC, color: "bg-brand-blue" },
    { label: "Béton (BCBs)", value: coutBCB, color: "bg-slate-500" },
    { label: "Sous-traitance", value: coutCST, color: "bg-violet-500" },
    { label: "Dépenses", value: coutDepenses, color: "bg-orange-400" },
    { label: "Pompage", value: coutPompe, color: "bg-teal-500" },
  ].filter((i) => i.value > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <Link
          href="/marge-rentabilite"
          className="mt-0.5 rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-brand-blue"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="font-mono text-xs text-slate-400">{chantier.reference}</p>
          <h1 className="text-xl font-bold text-brand-navy">{chantier.nom}</h1>
          <Link href={`/chantiers/${chantier.id}`} className="text-xs text-brand-blue hover:underline">
            Voir le chantier →
          </Link>
        </div>
        {dérive && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Dérive — coûts supérieurs au CA prévu
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500">{k.label}</p>
            <p className={`mt-1 text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Répartition des coûts */}
      {costItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Gauge className="h-4 w-4" /> Répartition des coûts DS réel
          </h2>
          <div className="flex flex-col gap-2.5">
            {costItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-xs text-slate-600">{item.label}</div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${pct(item.value, coutsEngagés)}%` }}
                  />
                </div>
                <div className="w-32 shrink-0 text-right font-mono text-xs font-semibold text-slate-700">
                  {formatEuros(item.value)}
                  <span className="ml-1 font-normal text-slate-400">
                    ({pct(item.value, coutsEngagés).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
          {référence > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-xs font-semibold text-slate-700">
                  Coûts / CA {caFacturé > 0 ? "facturé" : "prévu"}
                </div>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      dérive ? "bg-red-500" : pct(coutsEngagés, référence) > 85 ? "bg-orange-400" : "bg-green-500"
                    }`}
                    style={{ width: `${pct(coutsEngagés, référence)}%` }}
                  />
                </div>
                <div className="w-32 shrink-0 text-right font-mono text-xs font-semibold text-brand-navy">
                  {pct(coutsEngagés, référence).toFixed(0)}% engagé
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Détail par poste */}
      <div className="grid gap-4 lg:grid-cols-2">
        {chantier.bonsCommande.length > 0 && (
          <Section icon={<ShoppingCart className="h-4 w-4" />} title="Bons de commande matériaux" total={coutBC}>
            <div className="divide-y divide-slate-50">
              {chantier.bonsCommande.map((bc) => (
                <div key={bc.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/bons-commande/${bc.id}`}
                        className="font-mono text-xs font-semibold text-brand-blue hover:underline"
                      >
                        {bc.numero}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">{bc.fournisseur.nom}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {formatEuros(bc.totalHT)}
                    </span>
                  </div>
                  {bc.lignes.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {bc.lignes.slice(0, 5).map((l, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-slate-500">
                          <span className="max-w-[200px] truncate">{l.designation}</span>
                          <span className="ml-2 shrink-0 font-mono">
                            {l.quantite != null
                              ? `${l.quantite} ${l.unite ?? ""} × ${formatEuros(l.prixUnitaireHT ?? 0)}`
                              : formatEuros(l.totalHT ?? 0)}
                          </span>
                        </div>
                      ))}
                      {bc.lignes.length > 5 && (
                        <p className="text-[10px] text-slate-400">+ {bc.lignes.length - 5} ligne(s)</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {chantier.bonsCommandeBeton.length > 0 && (
          <Section icon={<Package className="h-4 w-4" />} title="Bons de commande béton" total={coutBCB}>
            <div className="divide-y divide-slate-50">
              {chantier.bonsCommandeBeton.map((bcb) => (
                <div key={bcb.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link
                      href={`/bons-commande/beton/${bcb.id}`}
                      className="font-mono text-xs font-semibold text-brand-blue hover:underline"
                    >
                      {bcb.numero}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {bcb.fournisseur.nom}
                      {bcb.classeResistance ? ` — ${bcb.classeResistance}` : ""}
                      {bcb.qteTotale ? ` — ${bcb.qteTotale} m³` : ""}
                      {bcb.prixM3 ? ` à ${formatEuros(bcb.prixM3)}/m³` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {formatEuros(bcb.totalHT)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {chantier.contrats.length > 0 && (
          <Section icon={<HardHat className="h-4 w-4" />} title="Contrats sous-traitance" total={coutCST}>
            <div className="divide-y divide-slate-50">
              {chantier.contrats.map((ct) => (
                <div key={ct.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link
                      href={`/contrats-sous-traitance/${ct.id}`}
                      className="font-mono text-xs font-semibold text-brand-blue hover:underline"
                    >
                      {ct.numero}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {ct.sousTraitant.nom}
                      {ct.objet ? ` — ${ct.objet}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {formatEuros(ct.montantHT ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {chantier.depenses.length > 0 && (
          <Section icon={<Wallet className="h-4 w-4" />} title="Dépenses réelles" total={coutDepenses}>
            <div className="max-h-64 divide-y divide-slate-50 overflow-y-auto">
              {chantier.depenses.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{d.libelle}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(d.date)}
                      {d.fournisseur ? ` — ${d.fournisseur.nom}` : ""}
                      {" — "}
                      {d.categorie}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 font-mono text-sm text-slate-700">
                    {formatEuros(d.montant)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Factures */}
      {chantier.factures.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-brand-navy">Factures émises (CA réel)</h2>
            <span className="font-mono font-bold text-green-600">{formatEuros(caFacturé)}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {chantier.factures.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link
                    href={`/factures/${f.id}`}
                    className="font-mono text-xs font-semibold text-brand-blue hover:underline"
                  >
                    {f.numero}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">{formatDate(f.dateEmission)}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-green-600">{formatEuros(f.totalHT)}</p>
                  {f.montantPaye < f.totalHT && (
                    <p className="text-[10px] text-slate-400">encaissé : {formatEuros(f.montantPaye)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
