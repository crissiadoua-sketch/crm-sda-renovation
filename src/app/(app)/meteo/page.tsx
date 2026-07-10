export const dynamic = "force-dynamic";

import { MeteoDashboard } from "@/components/meteo/meteo-dashboard";
import { Cloud } from "lucide-react";

export default function MeteoPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <Cloud className="h-6 w-6 text-brand-blue" />
          <h2 className="text-xl font-bold text-brand-navy">Journal Météo BTP</h2>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          Météo en temps réel sur les chantiers · Détection automatique des conditions d&apos;intempéries ·
          Villes du 31, 32, 09, 47, 65, 64, 12, 82
        </p>
      </div>

      <MeteoDashboard />
    </div>
  );
}
