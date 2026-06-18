import { ParametresForm } from "@/components/parametres/parametres-form";
import { updateParametres } from "@/lib/actions/parametres";
import { prisma } from "@/lib/prisma";

export default async function ParametresPage() {
  const parametres = await prisma.parametres.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Paramètres du CRM</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configurez les informations de votre entreprise, vos coordonnées bancaires et les valeurs par défaut de vos
          documents.
        </p>
      </div>

      <ParametresForm parametres={parametres} action={updateParametres} />
    </div>
  );
}
