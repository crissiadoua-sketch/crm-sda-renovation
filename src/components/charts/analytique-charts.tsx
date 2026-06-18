"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

// ─── Couleurs SDA ───────────────────────────────────────────────────────────
const C_ORANGE = "#F7941E";
const C_ORANGE_DARK = "#E6471D";
const C_BLUE = "#29ABE2";
const C_BLUE_DARK = "#1B3F94";
const C_NAVY = "#1E2F6E";
const C_GREEN = "#10b981";
const C_RED = "#ef4444";
const C_SLATE = "#94a3b8";

const PALETTE = [C_BLUE_DARK, C_BLUE, C_ORANGE, C_ORANGE_DARK, C_GREEN, "#8b5cf6", "#f59e0b", C_SLATE];

// ─── Tooltip générique ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, format = "euros" }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  format?: "euros" | "number" | "percent";
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) =>
    format === "euros"
      ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
      : format === "percent"
      ? `${v.toFixed(1)} %`
      : v.toString();
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm">
      {label && <p className="mb-1 font-semibold text-brand-navy">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name} : {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── 1. Évolution du CA mensuel ─────────────────────────────────────────────
export type CaMensuelData = { mois: string; facture: number; encaisse: number; devis: number };

export function CaMensuelChart({ data }: { data: CaMensuelData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
        />
        <Tooltip content={<ChartTooltip format="euros" />} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Line
          type="monotone"
          dataKey="devis"
          name="Devis émis"
          stroke={C_SLATE}
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="facture"
          name="Facturé"
          stroke={C_BLUE}
          strokeWidth={2.5}
          dot={{ r: 3, fill: C_BLUE }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="encaisse"
          name="Encaissé"
          stroke={C_GREEN}
          strokeWidth={2.5}
          dot={{ r: 3, fill: C_GREEN }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── 2. Répartition des clients par type ────────────────────────────────────
export type ClientTypeData = { name: string; value: number };

export function ClientTypePieChart({ data }: { data: ClientTypeData[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${Number(value)} clients`, ""]}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="truncate">{d.name}</span>
            <span className="ml-auto font-semibold">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. CA par chantier (top 10) ────────────────────────────────────────────
export type CaChantierData = { nom: string; ca: number; marge: number };

export function CaChantierBar({ data }: { data: CaChantierData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
        />
        <YAxis
          type="category"
          dataKey="nom"
          tick={{ fontSize: 10, fill: "#64748b" }}
          width={120}
        />
        <Tooltip content={<ChartTooltip format="euros" />} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar dataKey="ca" name="CA facturé" fill={C_BLUE} radius={[0, 4, 4, 0]} />
        <Bar dataKey="marge" name="Encaissé" fill={C_GREEN} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 4. Funnel commercial devis → facture → payé ────────────────────────────
export type FunnelData = { name: string; value: number; fill: string };

export function FunnelCommercialChart({ data }: { data: FunnelData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <FunnelChart>
        <Tooltip
          formatter={(value) => [`${Number(value)}`, ""]}
          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
        />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList
            dataKey="name"
            position="right"
            style={{ fontSize: "12px", fill: "#475569", fontWeight: 500 }}
          />
          <LabelList
            dataKey="value"
            position="center"
            style={{ fontSize: "13px", fill: "#fff", fontWeight: 700 }}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

// ─── 5. Radar par corps d'état (stock ou chantier) ──────────────────────────
export type RadarCorpsData = { corpsEtat: string; valeur: number; objectif?: number };

export function RadarCorpsChart({ data }: { data: RadarCorpsData[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="corpsEtat" tick={{ fontSize: 10, fill: "#64748b" }} />
        <PolarRadiusAxis
          angle={30}
          domain={[0, "auto"]}
          tick={{ fontSize: 9, fill: "#94a3b8" }}
        />
        <Radar name="Valeur stock" dataKey="valeur" stroke={C_BLUE} fill={C_BLUE} fillOpacity={0.3} />
        {data.some((d) => d.objectif != null) && (
          <Radar name="Objectif" dataKey="objectif" stroke={C_ORANGE} fill={C_ORANGE} fillOpacity={0.15} />
        )}
        <Tooltip
          formatter={(value) => [new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value)), ""]}
          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── 6. Dépenses par catégorie (bar groupé mensuel) ─────────────────────────
export type DepenseMensuelleData = { mois: string; MATERIAUX: number; MAIN_OEUVRE: number; SOUS_TRAITANCE: number; AUTRE: number };

export function DepensesBar({ data }: { data: DepenseMensuelleData[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<ChartTooltip format="euros" />} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        <Bar dataKey="MATERIAUX" name="Matériaux" fill={C_BLUE} stackId="a" />
        <Bar dataKey="SOUS_TRAITANCE" name="Sous-traitance" fill={C_ORANGE} stackId="a" />
        <Bar dataKey="MAIN_OEUVRE" name="Main-d'œuvre" fill={C_NAVY} stackId="a" />
        <Bar dataKey="AUTRE" name="Autre" fill={C_SLATE} stackId="a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
