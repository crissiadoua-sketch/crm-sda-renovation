"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUT_COLORS: Record<string, string> = {
  "À faire": "#94a3b8",
  "En cours": "#29ABE2",
  "En attente": "#F7941E",
  "Terminée": "#10b981",
  "Annulée": "#e2e8f0",
};

const SERVICE_COLORS = [
  "#1B3F94", "#29ABE2", "#F7941E", "#E6471D",
  "#10b981", "#8b5cf6", "#f59e0b", "#6366f1",
];

const PRIORITE_COLORS: Record<string, string> = {
  "Faible": "#94a3b8",
  "Normale": "#29ABE2",
  "Haute": "#F7941E",
  "Urgente": "#E6471D",
};

type StatutData = { name: string; value: number };
type ServiceData = { service: string; aFaire: number; enCours: number; terminee: number };
type PrioriteData = { name: string; value: number };

function CustomTooltipPie({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg text-sm">
        <p className="font-semibold text-brand-navy">{payload[0].name}</p>
        <p className="text-slate-600">{payload[0].value} tâche{payload[0].value > 1 ? "s" : ""}</p>
      </div>
    );
  }
  return null;
}

function CustomTooltipBar({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-sm">
        <p className="mb-1 font-semibold text-brand-navy">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name} : {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function TachesStatutPie({ data }: { data: StatutData[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={STATUT_COLORS[entry.name] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltipPie />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUT_COLORS[d.name] ?? "#94a3b8" }} />
            {d.name} ({total > 0 ? Math.round((d.value / total) * 100) : 0} %)
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">{total} tâches au total</p>
    </div>
  );
}

export function TachesServiceBar({ data }: { data: ServiceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="service"
          tick={{ fontSize: 10, fill: "#64748b" }}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
        <Tooltip content={<CustomTooltipBar />} />
        <Legend
          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          formatter={(v) => <span className="text-slate-600">{v}</span>}
        />
        <Bar dataKey="aFaire" name="À faire" fill="#94a3b8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="enCours" name="En cours" fill="#29ABE2" radius={[3, 3, 0, 0]} />
        <Bar dataKey="terminee" name="Terminée" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TachesPrioritePie({ data }: { data: PrioriteData[] }) {
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={PRIORITE_COLORS[entry.name] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltipPie />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITE_COLORS[d.name] ?? "#94a3b8" }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
