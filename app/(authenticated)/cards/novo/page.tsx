import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { CardForm } from "../CardForm";

// Página de criação de card (somente ADMIN)
export default async function NovoCardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Novo Card</h1>
      <CardForm />
    </div>
  );
}
