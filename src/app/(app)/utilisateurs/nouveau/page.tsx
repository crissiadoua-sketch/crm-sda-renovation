import Link from "next/link";
import { UserForm } from "@/components/utilisateurs/user-form";
import { createUser } from "@/lib/actions/utilisateurs";
import { getUser } from "@/lib/dal";
import { isFullAccessRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function NouvelUtilisateurPage() {
  const current = await getUser();
  if (!isFullAccessRole(current.role)) redirect("/acces-refuse");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/utilisateurs" className="text-sm text-brand-blue hover:underline">
          ← Retour aux utilisateurs
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau compte utilisateur</h2>
        <p className="mt-1 text-sm text-slate-500">
          Créez un compte de connexion au CRM pour un collaborateur et définissez ses droits d'accès.
        </p>
      </div>

      <UserForm action={createUser} />
    </div>
  );
}
