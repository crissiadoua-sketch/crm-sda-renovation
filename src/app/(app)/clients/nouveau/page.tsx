import { ClientForm } from "@/components/clients/client-form";
import { createClient } from "@/lib/actions/clients";

export default function NouveauClientPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouveau client</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ClientForm action={createClient} />
      </div>
    </div>
  );
}
